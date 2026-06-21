/**
 * Load test (k6): N user gửi tin ĐỒNG THỜI vào cùng 1 group chat.
 *
 * Vì sao k6 thay vì script Node cũ:
 *   Script Node giữ toàn bộ WS trên MỘT event-loop đơn luồng -> ở mức ~1000 conn
 *   nó tự nghẽn (broken pipe), tức là đo chính cái load generator chứ không phải
 *   backend. k6 chạy goroutine (Go) nên gánh vài nghìn WS thật sự song song.
 *
 * Phân chia việc:
 *   - File NÀY: register + login N user, tạo group, mở N WS, bắn tin, đếm tin
 *     nhận được + latency. (k6 không có OS access nên KHÔNG kiểm tra DB ở đây.)
 *   - Đếm tin trong Postgres: chạy `node scripts/check-db-loadtest.mjs` SAU khi
 *     k6 xong (nó tự dò group LOADTEST mới nhất, hoặc nhận GROUP_ID=...).
 *
 * Cài k6 (chọn 1):
 *   brew install k6
 *   # hoặc Docker (mount thư mục scripts để chạy file):
 *   docker run --rm -i --network host -v "$PWD/scripts:/s" grafana/k6 run /s/load-test-group-chat.k6.js
 *
 * Chạy (mặc định = qua nginx :80, profile prod):
 *   k6 run scripts/load-test-group-chat.k6.js
 *   NUM_USERS=1000 k6 run scripts/load-test-group-chat.k6.js
 *
 *   # Dev (backend trực tiếp :8080, không qua nginx):
 *   BASE_URL=http://localhost:8080 WS_URL=ws://localhost:8080/ws k6 run scripts/load-test-group-chat.k6.js
 *
 * Cấu hình qua biến môi trường (đều có default):
 *   BASE_URL          http://localhost
 *   WS_URL            ws://localhost/ws
 *   NUM_USERS         1000
 *   PASSWORD          Test1234
 *   EMAIL_PREFIX      loadtest        (email = <prefix><i>@example.com)
 *   MSG_PER_USER      1               (số tin mỗi user bắn)
 *   CONNECT_GRACE_MS  30000           (chờ TẤT CẢ WS open xong rồi mới đồng loạt bắn; tăng nếu connect errors > 0)
 *   SETTLE_MS         30000           (chờ tin về sau khi bắn)
 *   MAX_DURATION      (suy ra)        (mặc định = GRACE + SETTLE + 60s; override nếu cần)
 *   SETUP_TIMEOUT     600s            (trần thời gian setup: register + login mọi user)
 *   LATENCY_SAMPLE_RATE (tự suy)      (0..1: tỉ lệ tin được ghi latency; bỏ trống = tự suy theo CAP)
 *   LATENCY_SAMPLE_CAP  200000        (khi tự suy: giữ tổng mẫu latency ≈ giá trị này -> chặn OOM client ở N lớn)
 *
 * Số liệu k6 in ra (custom metrics):
 *   msgs_sent        tổng tin đã bắn
 *   msgs_received    tổng tin WS nhận được
 *   msg_latency      latency nhận tin (nhận - gửi), xem p95/p99/max
 *   recv_per_client  phân bố số tin mỗi client nhận (min/avg/p90/p95/max)
 *   fully_delivered  tỉ lệ client nhận ĐỦ (>= expectedSent)
 *   ws_connect_errors số WS lỗi/không open được
 *
 * Backend broadcast tin group tới TẤT CẢ thành viên (kể cả người gửi), nên mỗi
 * client kỳ vọng nhận = (số user bắn được) * MSG_PER_USER.
 */

import http from 'k6/http';
import encoding from 'k6/encoding';
import { WebSocket } from 'k6/websockets';
import { Counter, Trend, Rate } from 'k6/metrics';
// setTimeout/clearTimeout là global trong k6 (không cần import).

const BASE_URL         = __ENV.BASE_URL         || 'http://localhost';
const WS_URL           = __ENV.WS_URL           || 'ws://localhost/ws';
const NUM_USERS        = parseInt(__ENV.NUM_USERS        || '3000', 10);
const PASSWORD         = __ENV.PASSWORD         || 'Test1234';
const EMAIL_PREFIX     = __ENV.EMAIL_PREFIX     || 'loadtest';
const MSG_PER_USER     = parseInt(__ENV.MSG_PER_USER     || '1', 10);

// ── LATENCY SAMPLING (chống OOM ở client) ────────────────────────────────────
// Group fan-out là n×n: client phải NHẬN ~ (số user)² tin (2000 user => 4 TRIỆU tin).
// msg_latency là Trend -> k6 GIỮ MỌI sample trong RAM tới hết test để tính percentile.
// 4M sample => RAM client phình lên hàng GB (đã thấy ~10GB ở 2000 user).
// Cách chặn: chỉ ghi latency cho MỘT PHẦN tin. Delivery (msgs_received / fully_delivered)
// vẫn đếm ĐỦ 100% — chỉ Trend latency bị lấy mẫu, percentile vẫn chuẩn với ~vài chục nghìn mẫu.
//   - LATENCY_SAMPLE_RATE : ép cứng tỉ lệ 0..1 (vd 0.05 = ghi 5% số tin). Bỏ trống = tự suy.
//   - LATENCY_SAMPLE_CAP  : khi tự suy, giữ tổng số mẫu latency ≈ giá trị này (mặc định 200k).
const LATENCY_SAMPLE_RATE = __ENV.LATENCY_SAMPLE_RATE ? parseFloat(__ENV.LATENCY_SAMPLE_RATE) : null;
const LATENCY_SAMPLE_CAP  = parseInt(__ENV.LATENCY_SAMPLE_CAP || '200000', 10);

// Mặc định 30s (trước là 15s): mở 1000–1500 WS cùng lúc cần đủ thời gian để
// MỌI VU open xong TRƯỚC mốc bắn. Nếu còn ws_connect_errors > 0 ở N lớn -> tăng tiếp.
const CONNECT_GRACE_MS = parseInt(__ENV.CONNECT_GRACE_MS || '30000', 10);
const SETTLE_MS        = parseInt(__ENV.SETTLE_MS        || '30000', 10);

// ── CHẾ ĐỘ BẮN ───────────────────────────────────────────────────────────────
// SEND_BATCH = 0 (mặc định): tất cả VU bắn ĐỒNG LOẠT tại fireAtEpoch — thundering herd,
//   kịch bản TỆ NHẤT (đo trần hấp thụ spike). Drop coalescer dễ xảy ra ở đây và là BÌNH THƯỜNG.
// SEND_BATCH > 0: bắn so le theo nhóm — mỗi nhóm SEND_BATCH user bắn cách nhau SEND_GAP_MS.
//   Giống tải thực tế (tin rải theo thời gian); chọn SEND_BATCH ≤ cap coalescer để inbound/window
//   không vượt drain -> đo sustained throughput, tách "chậm" khỏi "mất do spike".
const SEND_BATCH  = parseInt(__ENV.SEND_BATCH  || '0',  10);
const SEND_GAP_MS = parseInt(__ENV.SEND_GAP_MS || '100', 10);

// maxDuration phải BAO trọn vòng đời 1 VU = open + CONNECT_GRACE + SETTLE, nếu không
// k6 sẽ giết VU (gracefulStop) TRƯỚC khi event 'close' kịp ghi recv_per_client/
// fully_delivered -> số liệu bị lệch lạc quan. Suy ra động từ GRACE + SETTLE + biên mở.
const OPEN_MARGIN_MS      = 60000;
const DERIVED_MAX_DUR_SEC = Math.ceil((CONNECT_GRACE_MS + SETTLE_MS + OPEN_MARGIN_MS) / 1000);

const MARKER = 'LOADTEST';
const MARK   = MARKER + '|';   // token đếm trong raw frame (content = "LOADTEST|idx|seq|ts")

const emailOf  = (i) => `${EMAIL_PREFIX}${i}@example.com`;
const deviceOf = (i) => `loadtest-device-${i}`;
// connectionId: định danh PER-TAB (per-connection), khác deviceId (định danh trình duyệt/auth).
// WS handshake BẮT BUỘC param này (JwtInterceptor) — thiếu sẽ bị 400. Mỗi VU = 1 connection = 1 id.
const connOf   = (i) => `loadtest-conn-${i}`;

// ---- custom metrics ----
const msgsSent        = new Counter('msgs_sent');
const msgsReceived    = new Counter('msgs_received');
const msgLatency      = new Trend('msg_latency', true);   // true = đơn vị thời gian
const latencySamples  = new Counter('latency_samples');   // số mẫu latency thực ghi (sau lấy mẫu)
const recvPerClient   = new Trend('recv_per_client');
const fullyDelivered  = new Rate('fully_delivered');
const wsConnectErrors = new Counter('ws_connect_errors');

export const options = {
  // setup() register + login TẤT CẢ user (BCrypt server-side). Ở N lớn + DB lạnh,
  // việc này dễ vượt mốc mặc định 60s -> cả test bị abort trong setup. Nới rộng.
  setupTimeout: __ENV.SETUP_TIMEOUT || '600s',
  scenarios: {
    group_blast: {
      executor: 'per-vu-iterations',
      vus: NUM_USERS,
      iterations: 1,
      // Suy ra từ GRACE + SETTLE + biên mở (xem DERIVED_MAX_DUR_SEC). Vẫn cho phép
      // override bằng MAX_DURATION nếu cần.
      maxDuration: __ENV.MAX_DURATION || `${DERIVED_MAX_DUR_SEC}s`,
      gracefulStop: '60s',
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    // Tune theo nhu cầu; mặc định coi >=99% nhận đủ và p95 latency < 3s là đạt.
    fully_delivered: ['rate>0.99'],
    msg_latency: ['p(95)<3000'],
    ws_connect_errors: [`count<${Math.ceil(NUM_USERS * 0.02)}`], // <2% conn lỗi
  },
};

/** Giải mã "sub" (userId) trong payload JWT. Không verify chữ ký. */
function decodeJwtSub(jwt) {
  const part = jwt.split('.')[1];
  const json = encoding.b64decode(part, 'rawurl', 's'); // base64url -> string
  return JSON.parse(json).sub;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ---- setup: chạy 1 lần, chuẩn bị user + group, trả data cho mọi VU ----
export function setup() {
  const jsonHeaders = { headers: { 'Content-Type': 'application/json' } };

  // 1) Register (idempotent) — bỏ qua mọi lỗi (user đã tồn tại -> vẫn login được).
  const regReqs = [];
  for (let i = 0; i < NUM_USERS; i++) {
    regReqs.push({
      method: 'POST',
      url: `${BASE_URL}/api/auth/register`,
      body: JSON.stringify({ email: emailOf(i), fullName: `Load Test ${i}`, password: PASSWORD }),
      params: jsonHeaders,
    });
  }
  for (const c of chunk(regReqs, 50)) http.batch(c);

  // 2) Login lấy JWT cho từng user.
  const loginReqs = [];
  for (let i = 0; i < NUM_USERS; i++) {
    loginReqs.push({
      method: 'POST',
      url: `${BASE_URL}/api/auth/login`,
      body: JSON.stringify({ email: emailOf(i), password: PASSWORD, deviceId: deviceOf(i) }),
      params: jsonHeaders,
    });
  }

  const users = new Array(NUM_USERS).fill(null);
  let idx = 0;
  for (const c of chunk(loginReqs, 50)) {
    const resps = http.batch(c);
    for (const r of resps) {
      const i = idx++;
      if (r.status === 201) {
        try {
          const token = r.json('data'); // token là string ở field data
          if (token) {
            users[i] = { idx: i, userId: Number(decodeJwtSub(token)), token, deviceId: deviceOf(i), connectionId: connOf(i) };
          }
        } catch (_) { /* parse fail -> để null */ }
      }
    }
  }

  const valid = users.filter(Boolean);
  if (valid.length < 2) {
    throw new Error(`Chỉ login được ${valid.length}/${NUM_USERS} user — cần >= 2 để test.`);
  }

  // 3) User đầu tiên tạo group chứa tất cả.
  const owner = valid[0];
  const memberIds = valid.slice(1).map((u) => u.userId);
  const created = http.post(
    `${BASE_URL}/api/groups`,
    JSON.stringify({ title: `LoadTest Group ${Date.now()}`, memberIds }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` } },
  );
  if (created.status !== 201) {
    throw new Error(`Tạo group thất bại: status ${created.status} ${created.body}`);
  }
  const groupId = created.json('data.groupId');

  const expectedSent = valid.length * MSG_PER_USER;
  // Mốc bắn chung (wall-clock): mọi VU canh đúng thời điểm này -> bắn gần đồng thời,
  // bất kể VU nào open sớm/muộn (miễn open trước mốc).
  const fireAtEpoch = Date.now() + CONNECT_GRACE_MS;

  // Khi bắn so le: offset lớn nhất = nhóm cuối cùng. Dùng để mọi VU đóng SAU khi
  // người bắn cuối cùng + drain xong (closeDelay tính theo mốc này, không theo mốc của riêng VU).
  const maxFireOffsetMs = SEND_BATCH > 0 ? Math.floor((valid.length - 1) / SEND_BATCH) * SEND_GAP_MS : 0;

  // Tổng tin mọi client kỳ vọng nhận = (số user) × (tin gửi đi) = n² ở group đầy đủ.
  // Tự suy sample-rate để giữ tổng mẫu latency ≈ LATENCY_SAMPLE_CAP (trừ khi ép cứng qua env).
  const expectedReceived = valid.length * expectedSent;
  let latencySampleRate;
  if (LATENCY_SAMPLE_RATE != null && Number.isFinite(LATENCY_SAMPLE_RATE)) {
    latencySampleRate = Math.min(1, Math.max(0, LATENCY_SAMPLE_RATE));
  } else {
    latencySampleRate = expectedReceived > 0 ? Math.min(1, LATENCY_SAMPLE_CAP / expectedReceived) : 1;
  }

  console.log(`[setup] login OK ${valid.length}/${NUM_USERS} | groupId=${groupId} | expectedSent=${expectedSent}`);
  console.log(`[setup] expectedReceived≈${expectedReceived} | latencySampleRate=${latencySampleRate.toFixed(4)} (≈${Math.round(expectedReceived * latencySampleRate)} mẫu latency)`);
  console.log(SEND_BATCH > 0
    ? `[setup] SO LE: ${SEND_BATCH} user/nhóm cách ${SEND_GAP_MS}ms, trải ${maxFireOffsetMs}ms`
    : `[setup] ĐỒNG LOẠT: tất cả ${valid.length} user bắn cùng lúc (thundering herd)`);
  console.log(`[setup] >>> Sau khi k6 xong, đếm DB:  GROUP_ID=${groupId} node scripts/check-db-loadtest.mjs  <<<`);

  // RAM: setup() return được k6 COPY vào TỪNG VU. Trả mảng object đầy đủ (token+deviceId+
  // connectionId+idx+userId) => mỗi VU giữ cả 2000 phần tử dù chỉ dùng 1 -> O(N²) heap (2000×2000).
  // deviceId/connectionId/idx đều suy ra được từ __VU, userId không dùng trong VU -> chỉ trả TOKEN
  // (string). Giữ nguyên vị trí null (login fail) để index __VU-1 vẫn khớp user gốc.
  const tokens = users.map((u) => (u ? u.token : null));
  return { tokens, groupId, expectedSent, fireAtEpoch, settleMs: SETTLE_MS, latencySampleRate, maxFireOffsetMs };
}

export default function (data) {
  const token = data.tokens[__VU - 1];
  if (!token) return; // user này login fail ở setup -> bỏ qua

  // Suy lại từ __VU thay vì nhận qua setup data (xem ghi chú RAM ở setup): idx === __VU-1,
  // deviceId/connectionId theo cùng công thức như khi login.
  const idx = __VU - 1;
  const deviceId = deviceOf(idx);
  const connectionId = connOf(idx);

  const groupId = data.groupId;
  const url = `${WS_URL}?token=${encodeURIComponent(token)}&deviceId=${encodeURIComponent(deviceId)}`
    + `&connectionId=${encodeURIComponent(connectionId)}`;

  const latencySampleRate = data.latencySampleRate ?? 1;
  // Capture ở scope này: handler 'message' shadow biến `data` (= ev.data), nên không đọc được
  // data.expectedSent bên trong nó. Dùng biến đã capture cho việc đóng-sớm-khi-đủ.
  const expectedSent = data.expectedSent;
  let received = 0;
  let opened = false;
  let closeTimer = null;
  let closed = false;
  const ws = new WebSocket(url);

  const closeNow = () => {
    if (closed) return;
    closed = true;
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    try { ws.close(); } catch (_) { /* ignore */ }
  };

  // Watchdog: không open được trong 15s -> tính là lỗi connect và đóng.
  const connectTimer = setTimeout(() => {
    if (!opened) {
      wsConnectErrors.add(1);
      try { ws.close(); } catch (_) { /* ignore */ }
    }
  }, 15000);

  ws.addEventListener('open', () => {
    opened = true;
    clearTimeout(connectTimer);

    const now = Date.now();
    // So le: VU bắn trễ theo nhóm của nó (idx / SEND_BATCH). SEND_BATCH=0 -> offset 0 = đồng loạt.
    const fireOffset = SEND_BATCH > 0 ? Math.floor(idx / SEND_BATCH) * SEND_GAP_MS : 0;
    const fireDelay  = Math.max(0, data.fireAtEpoch + fireOffset - now);
    // Đóng SAU người bắn cuối cùng (fireAtEpoch + maxFireOffset) + settle, để VU bắn sớm không
    // đóng trước khi nhận hết tin của những người bắn muộn.
    const closeDelay = Math.max(1000, data.fireAtEpoch + (data.maxFireOffsetMs || 0) + data.settleMs - now);

    // Bắn tại mốc của VU (đồng loạt nếu SEND_BATCH=0, so le nếu >0).
    setTimeout(() => {
      for (let seq = 0; seq < MSG_PER_USER; seq++) {
        try {
          ws.send(JSON.stringify({
            groupId,
            messageType: 'TEXT',
            content: `${MARKER}|${idx}|${seq}|${Date.now()}`,
          }));
          msgsSent.add(1);
        } catch (_) { /* socket đã đóng */ }
      }
    }, fireDelay);

    // Fallback: đóng theo wall-clock nếu KHÔNG nhận đủ trong cửa sổ settle (cap timeout).
    // Trường hợp đủ tin sẽ đóng sớm hơn ở handler 'message' (closeNow) -> bỏ artifact "thiếu 1 tin chót".
    closeTimer = setTimeout(closeNow, closeDelay);
  });

  // Đếm tin bằng QUÉT CHUỖI, KHÔNG JSON.parse — đây là cách giảm RAM/GC ở client:
  // với BATCH (§3.4 conflation) mỗi frame chứa tới ~128 tin; JSON.parse sẽ dựng object graph
  // cho hàng TRIỆU tin -> peak RAM + GC churn lớn. Thay vào đó chỉ đếm số lần "LOADTEST|"
  // xuất hiện trong raw frame (mỗi tin loadtest có content bắt đầu bằng marker này), và chỉ
  // trích 1 timestamp/frame khi trúng mẫu latency. Hoạt động cho cả frame lẻ lẫn BATCH.
  ws.addEventListener('message', (ev) => {
    const data = ev.data;
    if (typeof data !== 'string') return;
    const first = data.indexOf(MARK);
    if (first === -1) return;            // không phải tin loadtest (UNREAD_SNAPSHOT/PRESENCE...) -> bỏ, KHÔNG parse

    let n = 0;
    for (let idx = first; idx !== -1; idx = data.indexOf(MARK, idx + MARK.length)) n++;
    received += n;
    msgsReceived.add(n);

    // Đóng NGAY khi đã nhận đủ -> tránh artifact wall-clock cắt mất tin bắn cuối cùng.
    if (received >= expectedSent) {
      closeNow();
      return;
    }

    // Latency lấy mẫu Ở MỨC FRAME (1 timestamp/frame khi trúng mẫu) -> ít sample, ít RAM hơn nữa.
    if (latencySampleRate >= 1 || Math.random() < latencySampleRate) {
      const end = data.indexOf('"', first);   // content nằm trong cặp "..."; cắt tới dấu " kế tiếp
      if (end !== -1) {
        const sentAt = Number(data.slice(first, end).split('|')[3]); // LOADTEST|idx|seq|ts
        if (Number.isFinite(sentAt)) {
          msgLatency.add(Date.now() - sentAt);
          latencySamples.add(1);
        }
      }
    }
  });

  ws.addEventListener('error', () => {
    if (!opened) wsConnectErrors.add(1);
  });

  ws.addEventListener('close', () => {
    recvPerClient.add(received);
    fullyDelivered.add(received >= data.expectedSent);
  });
}

// ---- Báo cáo cuối + GUARD: cảnh báo khi fully_delivered KHÔNG đáng tin ----
// fully_delivered chỉ có nghĩa khi gần như mọi VU open được (expectedSent cố định từ
// số login OK ở setup; mỗi VW không open -> KHÔNG gửi -> mọi client thiếu tin -> rate sập).
// Vì vậy nếu ws_connect_errors > 0 thì rate thấp có thể do open-storm, KHÔNG phải mất tin.
// handleSummary thay thế bảng tổng kết mặc định bằng bản gọn, tự chứa (không cần import remote).
export function handleSummary(data) {
  const m = data.metrics || {};
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const cnt = (name) => num(m[name]?.values?.count);
  const trend = (name, stat) => num(m[name]?.values?.[stat]);
  const rate = (name) => num(m[name]?.values?.rate);

  const connectErrors = cnt('ws_connect_errors');
  const sent = cnt('msgs_sent');
  const received = cnt('msgs_received');
  const latSamples = cnt('latency_samples'); // số mẫu latency thực ghi (đã lấy mẫu)
  const deliveredRate = rate('fully_delivered');
  const effSampleRate = received > 0 ? latSamples / received : 1;
  const C = '\x1b[36m', G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', X = '\x1b[0m', B = '\x1b[1m';

  const lines = [];
  lines.push('');
  lines.push(`${B}${C}══════ LOAD TEST — KẾT QUẢ ══════${X}`);
  lines.push(`  Tin đã gửi (msgs_sent)      : ${sent}`);
  lines.push(`  Tin nhận (msgs_received)    : ${received}`);
  lines.push(`  Nhận đủ (fully_delivered)   : ${(deliveredRate * 100).toFixed(1)}%`);
  lines.push(`  Nhận/client (recv_per_client): avg ${trend('recv_per_client', 'avg').toFixed(0)} | p95 ${trend('recv_per_client', 'p(95)').toFixed(0)} | max ${trend('recv_per_client', 'max').toFixed(0)}`);
  lines.push(`  Latency ms (msg_latency)    : p95 ${trend('msg_latency', 'p(95)').toFixed(0)} | p99 ${trend('msg_latency', 'p(99)').toFixed(0)} | max ${trend('msg_latency', 'max').toFixed(0)} | avg ${trend('msg_latency', 'avg').toFixed(0)}`);
  lines.push(`     (latency lấy mẫu ${latSamples}/${received} tin ≈ ${(effSampleRate * 100).toFixed(1)}% — KHÔNG phải số tin nhận; delivery ở trên mới là đủ/thiếu)`);
  lines.push(`  WS connect errors           : ${connectErrors}`);
  lines.push('');

  if (connectErrors > 0) {
    lines.push(`${B}${Y}⚠ GUARD: ws_connect_errors = ${connectErrors} (> 0).${X}`);
    lines.push(`${Y}  => fully_delivered (${(deliveredRate * 100).toFixed(1)}%) KHÔNG đáng tin: có VU không open được nên`);
    lines.push(`     gửi thiếu tin, khiến MỌI client tính là "nhận thiếu" dù backend có thể giao đủ.`);
    lines.push(`     Tăng CONNECT_GRACE_MS (hiện ${CONNECT_GRACE_MS}ms) cho tới khi connect errors = 0 rồi đo lại.${X}`);
  } else {
    lines.push(`${G}✓ GUARD: 0 connect error -> fully_delivered đáng tin (mọi VU đã open & bắn).${X}`);
  }
  lines.push('');

  return { stdout: lines.join('\n') + '\n' };
}

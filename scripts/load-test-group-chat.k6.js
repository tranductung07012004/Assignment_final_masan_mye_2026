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
 *   CONNECT_GRACE_MS  15000           (chờ TẤT CẢ WS open xong rồi mới đồng loạt bắn)
 *   SETTLE_MS         15000           (chờ tin về sau khi bắn)
 *   MAX_DURATION      120s            (trần thời gian pha chạy WS)
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
const NUM_USERS        = parseInt(__ENV.NUM_USERS        || '1000', 10);
const PASSWORD         = __ENV.PASSWORD         || 'Test1234';
const EMAIL_PREFIX     = __ENV.EMAIL_PREFIX     || 'loadtest';
const MSG_PER_USER     = parseInt(__ENV.MSG_PER_USER     || '1', 10);
const CONNECT_GRACE_MS = parseInt(__ENV.CONNECT_GRACE_MS || '15000', 10);
const SETTLE_MS        = parseInt(__ENV.SETTLE_MS        || '30000', 10);

const MARKER = 'LOADTEST';

const emailOf  = (i) => `${EMAIL_PREFIX}${i}@example.com`;
const deviceOf = (i) => `loadtest-device-${i}`;

// ---- custom metrics ----
const msgsSent        = new Counter('msgs_sent');
const msgsReceived    = new Counter('msgs_received');
const msgLatency      = new Trend('msg_latency', true);   // true = đơn vị thời gian
const recvPerClient   = new Trend('recv_per_client');
const fullyDelivered  = new Rate('fully_delivered');
const wsConnectErrors = new Counter('ws_connect_errors');

export const options = {
  scenarios: {
    group_blast: {
      executor: 'per-vu-iterations',
      vus: NUM_USERS,
      iterations: 1,
      maxDuration: __ENV.MAX_DURATION || '120s',
      gracefulStop: '30s',
    },
  },
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
            users[i] = { idx: i, userId: Number(decodeJwtSub(token)), token, deviceId: deviceOf(i) };
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

  console.log(`[setup] login OK ${valid.length}/${NUM_USERS} | groupId=${groupId} | expectedSent=${expectedSent}`);
  console.log(`[setup] >>> Sau khi k6 xong, đếm DB:  GROUP_ID=${groupId} node scripts/check-db-loadtest.mjs  <<<`);

  return { users, groupId, expectedSent, fireAtEpoch, settleMs: SETTLE_MS };
}

export default function (data) {
  const u = data.users[__VU - 1];
  if (!u) return; // user này login fail ở setup -> bỏ qua

  const groupId = data.groupId;
  const url = `${WS_URL}?token=${encodeURIComponent(u.token)}&deviceId=${encodeURIComponent(u.deviceId)}`;

  let received = 0;
  let opened = false;
  const ws = new WebSocket(url);

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
    const fireDelay  = Math.max(0, data.fireAtEpoch - now);
    const closeDelay = Math.max(1000, data.fireAtEpoch + data.settleMs - now);

    // Bắn đồng loạt tại fireAtEpoch.
    setTimeout(() => {
      for (let seq = 0; seq < MSG_PER_USER; seq++) {
        try {
          ws.send(JSON.stringify({
            groupId,
            messageType: 'TEXT',
            content: `${MARKER}|${u.idx}|${seq}|${Date.now()}`,
          }));
          msgsSent.add(1);
        } catch (_) { /* socket đã đóng */ }
      }
    }, fireDelay);

    // Chờ tin về xong thì đóng.
    setTimeout(() => { try { ws.close(); } catch (_) { /* ignore */ } }, closeDelay);
  });

  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (_) { return; }
    // Chỉ đếm tin group đúng loadtest (bỏ UNREAD_SNAPSHOT, PRESENCE, READ_SYNC...).
    if (msg.groupId !== groupId || typeof msg.content !== 'string') return;
    if (!msg.content.startsWith(MARKER)) return;

    const sentAt = Number(msg.content.split('|')[3]);
    if (Number.isFinite(sentAt)) msgLatency.add(Date.now() - sentAt);
    received += 1;
    msgsReceived.add(1);
  });

  ws.addEventListener('error', () => {
    if (!opened) wsConnectErrors.add(1);
  });

  ws.addEventListener('close', () => {
    recvPerClient.add(received);
    fullyDelivered.add(received >= data.expectedSent);
  });
}

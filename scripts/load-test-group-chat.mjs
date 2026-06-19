#!/usr/bin/env node
/**
 * Load test: 50 users gửi tin nhắn ĐỒNG THỜI vào cùng 1 group chat.
 *
 * Yêu cầu: Node >= 21 (dùng global fetch + WebSocket native — không cần npm install).
 * Bản này test với Node v22 trên máy bạn => chạy thẳng được.
 *
 * Luồng chạy:
 *   1. Tạo (register) N user test, rồi login lấy JWT access token cho từng user.
 *   2. User đầu tiên tạo 1 group chứa tất cả N user.
 *   3. Mở N kết nối WebSocket (mỗi user 1 connection).
 *   4. Tới "thời điểm bắn", tất cả N user gửi tin nhắn group cùng lúc.
 *   5. Đếm số tin mỗi client nhận được + đo độ trễ (latency) và in báo cáo.
 *
 * Backend broadcast tin group tới TẤT CẢ thành viên (kể cả người gửi), nên:
 *   - Tổng tin gửi đi   = N
 *   - Tổng tin kỳ vọng nhận = N * N   (mỗi user nhận đủ N tin)
 *
 * Cấu hình qua biến môi trường (đều có default):
 *   BASE_URL   http://localhost        (mặc định = nginx port 80, profile prod của docker-compose)
 *   WS_URL     ws://localhost/ws       (nginx proxy /ws -> backend)
 *   NUM_USERS  50
 *   PASSWORD   Test1234
 *   EMAIL_PREFIX  loadtest          (email = <prefix><i>@example.com)
 *   SETTLE_MS  5000                 (thời gian chờ tin về sau khi bắn)
 *   MSG_PER_USER 1                  (số tin mỗi user gửi trong đợt bắn)
 *   SKIP_DB_CHECK 0                 (đặt 1 để bỏ qua bước kiểm tra DB)
 *   DB_CONTAINER  db                (container Postgres để `docker exec` vào)
 *   PG_USER    user                 (user psql)
 *   PG_DB      db                   (database psql)
 *
 * Bước kiểm tra DB dùng `docker exec <DB_CONTAINER> psql ...` để đếm số tin
 * LOADTEST thực sự ghi xuống bảng chat_messages cho group vừa test, và phát
 * hiện bản ghi trùng (cùng senderIdx|seq). Nếu không có docker thì tự bỏ qua.
 *
 * Ví dụ chạy:
 *   # Profile prod (qua nginx :80) — đúng với mặc định:
 *   node scripts/load-test-group-chat.mjs
 *   NUM_USERS=100 node scripts/load-test-group-chat.mjs
 *
 *   # Dev (backend chạy trực tiếp :8080, không qua nginx):
 *   BASE_URL=http://localhost:8080 WS_URL=ws://localhost:8080/ws node scripts/load-test-group-chat.mjs
 */

import { spawnSync } from 'node:child_process';

const BASE_URL     = process.env.BASE_URL     || 'http://localhost';
const WS_URL       = process.env.WS_URL       || 'ws://localhost/ws';
const NUM_USERS    = parseInt(process.env.NUM_USERS    || '1500', 10);
const PASSWORD     = process.env.PASSWORD     || 'Test1234';
const EMAIL_PREFIX = process.env.EMAIL_PREFIX || 'loadtest';
const SETTLE_MS    = parseInt(process.env.SETTLE_MS    || '30000', 10);
const MSG_PER_USER = parseInt(process.env.MSG_PER_USER || '1', 10);
// Mở WS theo lô để tránh "open storm" (mở tất cả cùng lúc làm rớt handshake).
// WS_OPEN_BATCH=0 (mặc định) = mở tất cả cùng lúc (hành vi cũ).
// >0 = mỗi lô mở bấy nhiêu connection rồi nghỉ WS_OPEN_DELAY_MS trước lô kế.
const WS_OPEN_BATCH    = parseInt(process.env.WS_OPEN_BATCH    || '0', 10);
const WS_OPEN_DELAY_MS = parseInt(process.env.WS_OPEN_DELAY_MS || '100', 10);

// ---- Kiểm tra DB (đếm tin LOADTEST thực sự ghi xuống Postgres) ----
// Chạy `docker exec <container> psql ...` nên KHÔNG cần driver pg.
// Đặt SKIP_DB_CHECK=1 nếu muốn bỏ qua (vd chạy ở môi trường không có docker).
const SKIP_DB_CHECK = process.env.SKIP_DB_CHECK === '1' || process.env.SKIP_DB_CHECK === 'true';
const DB_CONTAINER  = process.env.DB_CONTAINER || 'db';     // container_name trong docker-compose
const PG_USER       = process.env.PG_USER      || 'user';
const PG_DB         = process.env.PG_DB        || 'db';

const emailOf  = (i) => `${EMAIL_PREFIX}${i}@example.com`;
const deviceOf = (i) => `loadtest-device-${i}`;
// connectionId: định danh PER-TAB (per-connection), khác deviceId (định danh trình duyệt/auth).
// WS handshake BẮT BUỘC param này (JwtInterceptor) — thiếu sẽ bị 400. Mỗi user = 1 connection = 1 id.
const connOf   = (i) => `loadtest-conn-${i}`;
const sleep    = (ms) => new Promise((r) => setTimeout(r, ms));

// Mỗi tin tải được encode dạng: LOADTEST|<senderIdx>|<seq>|<epochMillisGửi>
// Người nhận parse epochMillis ra để tính latency = nhận - gửi.
const MARKER = 'LOADTEST';
const buildContent = (senderIdx, seq) => `${MARKER}|${senderIdx}|${seq}|${Date.now()}`;

function logStep(msg) {
  console.log(`\n\x1b[36m▶ ${msg}\x1b[0m`);
}

async function postJson(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* body rỗng */ }
  return { status: res.status, json };
}

/** Đảm bảo user i tồn tại + trả về { idx, userId, token, email, deviceId }. */
async function ensureUser(i) {
  const email = emailOf(i);
  const deviceId = deviceOf(i);

  // Register — nếu đã tồn tại thì bỏ qua lỗi và đi login luôn.
  const reg = await postJson('/api/auth/register', {
    email,
    fullName: `Load Test ${i}`,
    password: PASSWORD,
  });
  if (reg.status !== 201 && reg.status !== 409 && reg.status !== 400) {
    // 409/400 thường là "email đã tồn tại" -> vẫn login được. Lỗi khác mới đáng lo.
    console.warn(`  [user ${i}] register trả status ${reg.status}: ${JSON.stringify(reg.json)}`);
  }

  const login = await postJson('/api/auth/login', { email, password: PASSWORD, deviceId });
  if (login.status !== 201 || !login.json?.data) {
    throw new Error(`Login thất bại cho ${email}: status ${login.status} ${JSON.stringify(login.json)}`);
  }
  const token = login.json.data;
  // userId nằm trong "sub" của JWT.
  const userId = Number(decodeJwtSub(token));
  if (!userId) throw new Error(`Không lấy được userId từ token của ${email}`);

  return { idx: i, userId, token, email, deviceId };
}

/** Giải mã phần payload của JWT để lấy subject (userId). Không verify chữ ký. */
function decodeJwtSub(jwt) {
  const part = jwt.split('.')[1];
  const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  return JSON.parse(json).sub;
}

/** Mở 1 WebSocket cho user; resolve khi đã open. Gắn handler đếm tin nhận. */
function connectClient(user, groupId, stats) {
  return new Promise((resolve, reject) => {
    const url = `${WS_URL}?token=${encodeURIComponent(user.token)}&deviceId=${encodeURIComponent(user.deviceId)}`
      + `&connectionId=${encodeURIComponent(connOf(user.idx))}`;
    const ws = new WebSocket(url);
    user.ws = ws;
    user.received = 0;

    const openTimeout = setTimeout(() => reject(new Error(`WS timeout (open) cho user ${user.idx}`)), 15000);

    ws.addEventListener('open', () => {
      clearTimeout(openTimeout);
      resolve(ws);
    });

    ws.addEventListener('message', (ev) => {
      const now = Date.now();
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }

      // Chỉ quan tâm tin group đúng loadtest (bỏ qua UNREAD_SNAPSHOT, PRESENCE, READ_SYNC...).
      if (msg.groupId !== groupId || typeof msg.content !== 'string') return;
      if (!msg.content.startsWith(MARKER)) return;

      const parts = msg.content.split('|');
      const sentAt = Number(parts[3]);
      if (Number.isFinite(sentAt)) {
        stats.latencies.push(now - sentAt);
      }
      user.received += 1;
      stats.totalReceived += 1;
    });

    ws.addEventListener('error', (err) => {
      stats.wsErrors += 1;
      // không reject sau khi đã open — chỉ ghi nhận.
    });
    ws.addEventListener('close', (ev) => {
      if (ev.code !== 1000 && ev.code !== 1005) {
        stats.closes.push({ idx: user.idx, code: ev.code, reason: ev.reason });
      }
    });
  });
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length));
  return sortedArr[idx];
}

/**
 * Đếm số tin LOADTEST của group này đã GHI XUỐNG DB (qua docker exec psql),
 * và phát hiện trùng lặp dựa trên khoá (senderIdx|seq) nhúng trong content.
 * Trả về { total, distinctKeys, missing, duplicates } hoặc null nếu không kiểm tra được.
 */
function verifyDbPersistence(groupId, expectedSent) {
  // total       = tổng dòng LOADTEST của group.
  // distinctKeys= số cặp (senderIdx, seq) khác nhau -> số tin "logic" duy nhất.
  // total > distinctKeys  => có bản ghi TRÙNG (ghi >1 lần cùng 1 tin).
  // distinctKeys < expected => THIẾU tin.
  const sql =
    "SELECT count(*) AS total, " +
    "count(DISTINCT split_part(content,'|',2) || ':' || split_part(content,'|',3)) AS distinct_keys " +
    `FROM chat_messages WHERE group_id = ${Number(groupId)} AND content LIKE 'LOADTEST|%';`;

  const res = spawnSync(
    'docker',
    ['exec', '-i', DB_CONTAINER, 'psql', '-U', PG_USER, '-d', PG_DB, '-t', '-A', '-F', '|', '-c', sql],
    { encoding: 'utf8' }
  );

  if (res.error) {
    console.warn(`  ⚠ Không chạy được docker exec (${res.error.message}). Bỏ qua kiểm tra DB.`);
    return null;
  }
  if (res.status !== 0) {
    console.warn(`  ⚠ psql trả lỗi (status ${res.status}): ${(res.stderr || '').trim()}`);
    return null;
  }

  const line = res.stdout.split('\n').map((s) => s.trim()).filter(Boolean).pop() || '';
  const [totalStr, distinctStr] = line.split('|');
  const total = Number(totalStr);
  const distinctKeys = Number(distinctStr);
  if (!Number.isFinite(total) || !Number.isFinite(distinctKeys)) {
    console.warn(`  ⚠ Không parse được kết quả psql: "${line}"`);
    return null;
  }

  return {
    total,
    distinctKeys,
    missing: Math.max(0, expectedSent - distinctKeys),
    duplicates: Math.max(0, total - distinctKeys),
  };
}

async function main() {
  console.log(`\x1b[1mLoad test group chat\x1b[0m  |  ${NUM_USERS} users  |  ${BASE_URL}`);

  // ---- 1. Tạo + login users ----
  logStep(`Chuẩn bị ${NUM_USERS} user (register + login)...`);
  const users = [];
  // Tạo tuần tự theo lô để tránh quá tải auth, nhưng song song trong lô.
  const BATCH = 10;
  for (let start = 0; start < NUM_USERS; start += BATCH) {
    const batch = [];
    for (let i = start; i < Math.min(start + BATCH, NUM_USERS); i++) batch.push(ensureUser(i));
    const settled = await Promise.allSettled(batch);
    settled.forEach((r, k) => {
      if (r.status === 'fulfilled') users.push(r.value);
      else console.error(`  ✗ user ${start + k}: ${r.reason.message}`);
    });
  }
  if (users.length < 2) throw new Error('Cần ít nhất 2 user thành công để test.');
  users.sort((a, b) => a.idx - b.idx);
  console.log(`  ✓ ${users.length}/${NUM_USERS} user sẵn sàng.`);

  // ---- 2. User[0] tạo group chứa tất cả ----
  logStep('Tạo group chat...');
  const owner = users[0];
  const memberIds = users.slice(1).map((u) => u.userId); // chủ group thường được tự thêm
  const created = await postJson('/api/groups', {
    title: `LoadTest Group ${Date.now()}`,
    memberIds,
  }, owner.token);
  if (created.status !== 201 || !created.json?.data?.groupId) {
    throw new Error(`Tạo group thất bại: status ${created.status} ${JSON.stringify(created.json)}`);
  }
  const groupId = created.json.data.groupId;
  const memberCount = created.json.data.members?.length ?? '?';
  console.log(`  ✓ groupId=${groupId}, members=${memberCount}`);

  // ---- 3. Mở 50 WebSocket ----
  logStep('Mở WebSocket cho tất cả user...');
  const stats = { totalReceived: 0, latencies: [], wsErrors: 0, closes: [] };
  let conns;
  if (WS_OPEN_BATCH > 0) {
    console.log(`  (mở theo lô ${WS_OPEN_BATCH}, nghỉ ${WS_OPEN_DELAY_MS}ms giữa lô)`);
    conns = [];
    for (let start = 0; start < users.length; start += WS_OPEN_BATCH) {
      const slice = users.slice(start, start + WS_OPEN_BATCH);
      const settled = await Promise.allSettled(slice.map((u) => connectClient(u, groupId, stats)));
      conns.push(...settled);
      if (start + WS_OPEN_BATCH < users.length) await sleep(WS_OPEN_DELAY_MS);
    }
  } else {
    conns = await Promise.allSettled(users.map((u) => connectClient(u, groupId, stats)));
  }
  const connected = users.filter((u) => u.ws && u.ws.readyState === WebSocket.OPEN);
  const failedConn = conns.filter((c) => c.status === 'rejected');
  failedConn.forEach((c) => console.error(`  ✗ ${c.reason.message}`));
  console.log(`  ✓ ${connected.length}/${users.length} kết nối WS open.`);
  if (connected.length < 2) throw new Error('Quá ít WS kết nối được.');

  // Chờ một nhịp để server hoàn tất subscribe presence/registry trước khi bắn.
  await sleep(1000);

  // ---- 4. BẮN ĐỒNG THỜI ----
  logStep(`Tất cả ${connected.length} user gửi ${MSG_PER_USER} tin/đợt CÙNG LÚC...`);
  const expectedSent = connected.length * MSG_PER_USER;
  // Mỗi user nhận đủ số tin mà MỌI user gửi (broadcast tới cả người gửi).
  const expectedReceived = connected.length * expectedSent;

  const t0 = Date.now();
  for (let seq = 0; seq < MSG_PER_USER; seq++) {
    // Bắn không await giữa các client => gần như đồng thời.
    for (const u of connected) {
      try {
        u.ws.send(JSON.stringify({
          groupId,
          messageType: 'TEXT',
          content: buildContent(u.idx, seq),
        }));
      } catch (e) {
        console.error(`  ✗ send lỗi user ${u.idx}: ${e.message}`);
      }
    }
  }
  console.log(`  → Đã bắn ${expectedSent} tin trong ${Date.now() - t0}ms. Chờ ${SETTLE_MS}ms để tin về...`);

  // ---- 5. Chờ tin về rồi báo cáo ----
  await sleep(SETTLE_MS);

  const sortedLat = stats.latencies.slice().sort((a, b) => a - b);
  const sum = sortedLat.reduce((s, x) => s + x, 0);
  const perClientRecv = connected.map((u) => u.received);
  const minRecv = Math.min(...perClientRecv);
  const maxRecv = Math.max(...perClientRecv);
  const fullyDelivered = perClientRecv.filter((r) => r >= expectedSent).length;

  logStep('KẾT QUẢ');
  console.log(`  Users kết nối       : ${connected.length}`);
  console.log(`  Tin đã gửi          : ${expectedSent}`);
  console.log(`  Tin kỳ vọng nhận    : ${expectedReceived}  (mỗi user nhận ${expectedSent})`);
  console.log(`  Tin thực nhận       : ${stats.totalReceived}  (${((stats.totalReceived / expectedReceived) * 100).toFixed(1)}%)`);
  console.log(`  Client nhận đủ      : ${fullyDelivered}/${connected.length}`);
  console.log(`  Nhận/client min-max : ${minRecv} - ${maxRecv} (kỳ vọng ${expectedSent})`);
  console.log(`  Latency (ms)        : min ${sortedLat[0] ?? 0} | p50 ${percentile(sortedLat, 50)} | p95 ${percentile(sortedLat, 95)} | p99 ${percentile(sortedLat, 99)} | max ${sortedLat[sortedLat.length - 1] ?? 0} | avg ${sortedLat.length ? (sum / sortedLat.length).toFixed(1) : 0}`);
  console.log(`  WS errors           : ${stats.wsErrors}`);
  if (stats.closes.length) {
    console.log(`  WS close bất thường : ${stats.closes.length}`);
    stats.closes.slice(0, 5).forEach((c) => console.log(`     user ${c.idx}: code=${c.code} ${c.reason || ''}`));
  }

  // ---- 5b. Kiểm tra DB: đã ghi đủ tin chưa, có trùng không ----
  let dbOk = true; // mặc định không chặn PASS nếu không kiểm tra được
  if (!SKIP_DB_CHECK) {
    logStep('KIỂM TRA DB (chat_messages)');
    const db = verifyDbPersistence(groupId, expectedSent);
    if (db) {
      console.log(`  Tin LOADTEST trong DB: ${db.total}`);
      console.log(`  Tin duy nhất (sender|seq): ${db.distinctKeys} (kỳ vọng ${expectedSent})`);
      console.log(`  Thiếu               : ${db.missing}`);
      console.log(`  Trùng lặp           : ${db.duplicates}`);
      dbOk = db.missing === 0 && db.duplicates === 0;
      console.log(dbOk
        ? `  \x1b[32m✓ DB ghi ĐỦ và KHÔNG trùng.\x1b[0m`
        : `  \x1b[33m⚠ DB ${db.missing ? `THIẾU ${db.missing} tin` : ''}${db.missing && db.duplicates ? ', ' : ''}${db.duplicates ? `TRÙNG ${db.duplicates} bản ghi` : ''}.\x1b[0m`);
    }
  }

  const ok = stats.totalReceived >= expectedReceived && dbOk;
  console.log(ok
    ? `\n\x1b[32m✓ PASS — tất cả tin được phát đầy đủ và DB ghi đúng.\x1b[0m`
    : `\n\x1b[33m⚠ FAIL — ${stats.totalReceived < expectedReceived ? `thiếu ${expectedReceived - stats.totalReceived} tin ở WS; ` : ''}${!dbOk ? 'DB không khớp; ' : ''}kiểm tra log backend / nghẽn DB / Redis.\x1b[0m`);

  // ---- 6. Dọn dẹp ----
  for (const u of connected) {
    try { u.ws.close(1000); } catch { /* ignore */ }
  }
  await sleep(300);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n\x1b[31m✗ Lỗi: ${err.message}\x1b[0m`);
  console.error(err.stack);
  process.exit(1);
});

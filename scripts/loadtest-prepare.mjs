/**
 * Bước CHUẨN BỊ cho load test group-chat (chạy TRƯỚC `k6 run`).
 *
 * Vì sao tách ra: k6 `setup()` trả data về sẽ bị COPY vào TỪNG VU. Mảng token
 * (N phần tử) × N VU = O(N²) heap (~8GB ở 5000 user) — đây là phần RAM lớn nhất
 * còn lại của k6 sau khi đã sampling latency. Cách chữa là `SharedArray`: giữ token
 * 1 bản duy nhất, chia sẻ read-only. Nhưng `SharedArray` nạp từ FILE ở init-context,
 * mà init-context KHÔNG gọi HTTP được. Nên ta login ở ĐÂY (Node, có fetch + fs) rồi
 * ghi token ra file; k6 chỉ việc đọc file qua SharedArray.
 *
 * Việc làm:
 *   1) register (idempotent) + login N user -> token JWT.
 *   2) user[0] tạo group chứa tất cả.
 *   3) ghi scripts/.loadtest-data.json = { groupId, tokens } (tokens[i] = token của user i, null nếu fail).
 *
 * Chạy:
 *   node scripts/loadtest-prepare.mjs
 *   NUM_USERS=5000 BASE_URL=http://localhost node scripts/loadtest-prepare.mjs
 *
 * Lưu ý: access token hết hạn ~15 phút (jwt.expiration_access). Chạy k6 trong vòng
 * 15 phút sau khi prepare xong. Prepare lại nếu để lâu.
 *
 * Env (khớp với k6 script):
 *   BASE_URL=http://localhost  NUM_USERS=5000  PASSWORD=Test1234  EMAIL_PREFIX=loadtest
 *   CONCURRENCY=100            (số request login/register song song mỗi đợt)
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE_URL     = process.env.BASE_URL     || 'http://localhost';
const NUM_USERS    = parseInt(process.env.NUM_USERS    || '4000', 10);
const PASSWORD     = process.env.PASSWORD     || 'Test1234';
const EMAIL_PREFIX = process.env.EMAIL_PREFIX || 'loadtest';
const CONCURRENCY  = parseInt(process.env.CONCURRENCY  || '100', 10);

const OUT_FILE = join(dirname(fileURLToPath(import.meta.url)), '.loadtest-data.json');

const emailOf  = (i) => `${EMAIL_PREFIX}${i}@example.com`;
const deviceOf = (i) => `loadtest-device-${i}`;

const jsonHeaders = { 'Content-Type': 'application/json' };

/** sub (userId) trong JWT — KHÔNG verify chữ ký, chỉ lấy claim. */
function decodeJwtSub(jwt) {
  const payload = jwt.split('.')[1];
  const json = Buffer.from(payload, 'base64url').toString('utf8');
  return JSON.parse(json).sub;
}

/** Chạy `tasks` (mảng hàm trả Promise) theo từng đợt CONCURRENCY để không mở N socket cùng lúc. */
async function inBatches(tasks, size) {
  const results = new Array(tasks.length);
  for (let start = 0; start < tasks.length; start += size) {
    const slice = tasks.slice(start, start + size);
    const settled = await Promise.all(slice.map((t) => t()));
    for (let j = 0; j < settled.length; j++) results[start + j] = settled[j];
    process.stdout.write(`\r  ...${Math.min(start + size, tasks.length)}/${tasks.length}`);
  }
  process.stdout.write('\n');
  return results;
}

async function register(i) {
  try {
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: emailOf(i), fullName: `Load Test ${i}`, password: PASSWORD }),
    });
  } catch (_) { /* user đã tồn tại / lỗi tạm -> vẫn login được */ }
}

async function login(i) {
  try {
    const r = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: emailOf(i), password: PASSWORD, deviceId: deviceOf(i) }),
    });
    if (r.status !== 201) return null;
    const body = await r.json();
    return body?.data ?? null; // token string ở field data
  } catch (_) {
    return null;
  }
}

async function main() {
  console.log(`[prepare] BASE_URL=${BASE_URL} NUM_USERS=${NUM_USERS} CONCURRENCY=${CONCURRENCY}`);

  console.log('[prepare] 1) register (idempotent)...');
  await inBatches(Array.from({ length: NUM_USERS }, (_, i) => () => register(i)), CONCURRENCY);

  console.log('[prepare] 2) login...');
  const tokens = await inBatches(Array.from({ length: NUM_USERS }, (_, i) => () => login(i)), CONCURRENCY);

  const validIdx = [];
  for (let i = 0; i < tokens.length; i++) if (tokens[i]) validIdx.push(i);
  if (validIdx.length < 2) {
    throw new Error(`Chỉ login được ${validIdx.length}/${NUM_USERS} user — cần >= 2 để test.`);
  }

  console.log('[prepare] 3) tạo group chứa tất cả...');
  const ownerIdx = validIdx[0];
  const ownerToken = tokens[ownerIdx];
  const memberIds = validIdx.slice(1).map((i) => Number(decodeJwtSub(tokens[i])));
  const created = await fetch(`${BASE_URL}/api/groups`, {
    method: 'POST',
    headers: { ...jsonHeaders, Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ title: `LoadTest Group ${Date.now()}`, memberIds }),
  });
  if (created.status !== 201) {
    throw new Error(`Tạo group thất bại: status ${created.status} ${await created.text()}`);
  }
  const groupId = (await created.json())?.data?.groupId;

  // tokens giữ NGUYÊN vị trí (index = user index, null nếu login fail) để VU __VU-1 khớp đúng.
  writeFileSync(OUT_FILE, JSON.stringify({ groupId, tokens }));
  console.log(`[prepare] OK: login ${validIdx.length}/${NUM_USERS} | groupId=${groupId}`);
  console.log(`[prepare] đã ghi ${OUT_FILE}`);
  console.log(`[prepare] >>> chạy ngay (token sống ~15p):  k6 run scripts/load-test-group-chat.k6.js  <<<`);
  console.log(`[prepare] >>> đếm DB sau test:  GROUP_ID=${groupId} node scripts/check-db-loadtest.mjs  <<<`);
}

main().catch((e) => {
  console.error('[prepare] LỖI:', e.message);
  process.exit(1);
});

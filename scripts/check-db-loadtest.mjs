#!/usr/bin/env node
/**
 * Đếm tin LOADTEST đã GHI XUỐNG Postgres — bước kiểm tra DB tách rời cho k6.
 *
 * k6 (load-test-group-chat.k6.js) không có OS access nên không tự chạy psql được.
 * Chạy script này SAU khi k6 xong để xác nhận tin đã persist đủ và không trùng.
 *
 * Cách đếm: dùng `docker exec <container> psql ...` (KHÔNG cần driver pg).
 *   - total        = tổng dòng LOADTEST của group.
 *   - distinctKeys = số cặp (senderIdx, seq) khác nhau  -> số tin "logic" duy nhất.
 *   - total > distinctKeys   => có bản ghi TRÙNG.
 *   - distinctKeys < EXPECTED => THIẾU tin.
 *
 * Group nào? Mặc định tự dò group LOADTEST MỚI NHẤT (max id). Truyền GROUP_ID để chỉ định.
 *
 * Ví dụ:
 *   node scripts/check-db-loadtest.mjs                 # group LOADTEST mới nhất
 *   GROUP_ID=42 node scripts/check-db-loadtest.mjs     # group cụ thể (k6 in ra ở [setup])
 *   GROUP_ID=42 EXPECTED=1000 node scripts/check-db-loadtest.mjs   # có cả phát hiện THIẾU
 *
 * Biến môi trường:
 *   GROUP_ID      (mặc định: tự dò group LOADTEST mới nhất)
 *   EXPECTED      số tin kỳ vọng (= NUM_USERS * MSG_PER_USER); bỏ trống thì không tính "thiếu"
 *   DB_CONTAINER  db
 *   PG_USER       user
 *   PG_DB         db
 */

import { spawnSync } from 'node:child_process';

const GROUP_ID     = process.env.GROUP_ID ? Number(process.env.GROUP_ID) : null;
const EXPECTED     = process.env.EXPECTED ? Number(process.env.EXPECTED) : null;
const DB_CONTAINER = process.env.DB_CONTAINER || 'db';
const PG_USER      = process.env.PG_USER      || 'user';
const PG_DB        = process.env.PG_DB        || 'db';

function psql(sql) {
  const res = spawnSync(
    'docker',
    ['exec', '-i', DB_CONTAINER, 'psql', '-U', PG_USER, '-d', PG_DB, '-t', '-A', '-F', '|', '-c', sql],
    { encoding: 'utf8' },
  );
  if (res.error) throw new Error(`Không chạy được docker exec: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`psql lỗi (status ${res.status}): ${(res.stderr || '').trim()}`);
  return res.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

function main() {
  // Group cần đếm: chỉ định, hoặc tự dò group LOADTEST mới nhất.
  let groupId = GROUP_ID;
  if (groupId == null) {
    const rows = psql(
      "SELECT group_id FROM chat_messages WHERE content LIKE 'LOADTEST|%' " +
      "GROUP BY group_id ORDER BY max(id) DESC LIMIT 1;",
    );
    if (rows.length === 0) {
      console.error('✗ Không tìm thấy tin LOADTEST nào trong DB. Đã chạy k6 chưa?');
      process.exit(1);
    }
    groupId = Number(rows[0]);
    console.log(`(tự dò) group LOADTEST mới nhất: groupId=${groupId}`);
  }

  const sql =
    "SELECT count(*) AS total, " +
    "count(DISTINCT split_part(content,'|',2) || ':' || split_part(content,'|',3)) AS distinct_keys " +
    `FROM chat_messages WHERE group_id = ${Number(groupId)} AND content LIKE 'LOADTEST|%';`;

  const [line] = psql(sql);
  const [totalStr, distinctStr] = (line || '').split('|');
  const total = Number(totalStr);
  const distinctKeys = Number(distinctStr);
  if (!Number.isFinite(total) || !Number.isFinite(distinctKeys)) {
    throw new Error(`Không parse được kết quả psql: "${line}"`);
  }

  const duplicates = Math.max(0, total - distinctKeys);
  const missing = EXPECTED != null ? Math.max(0, EXPECTED - distinctKeys) : null;

  console.log(`\nKIỂM TRA DB (chat_messages) — groupId=${groupId}`);
  console.log(`  Tin LOADTEST trong DB     : ${total}`);
  console.log(`  Tin duy nhất (sender|seq) : ${distinctKeys}${EXPECTED != null ? ` (kỳ vọng ${EXPECTED})` : ''}`);
  if (missing != null) console.log(`  Thiếu                     : ${missing}`);
  console.log(`  Trùng lặp                 : ${duplicates}`);

  const ok = duplicates === 0 && (missing == null || missing === 0);
  console.log(ok
    ? `\n\x1b[32m✓ DB OK — ghi đủ và không trùng.\x1b[0m`
    : `\n\x1b[33m⚠ DB lệch — ${missing ? `THIẾU ${missing} tin` : ''}${missing && duplicates ? ', ' : ''}${duplicates ? `TRÙNG ${duplicates} bản ghi` : ''}.\x1b[0m`);
  process.exit(ok ? 0 : 1);
}

try {
  main();
} catch (err) {
  console.error(`\n\x1b[31m✗ Lỗi: ${err.message}\x1b[0m`);
  process.exit(1);
}

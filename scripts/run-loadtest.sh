#!/usr/bin/env bash
#
# Chạy TUẦN TỰ cả 3 bước load test group-chat trong 1 lệnh:
#   1) loadtest-prepare.mjs  — register + login + tạo group -> ghi scripts/.loadtest-data.json
#   2) k6 run                — đọc token qua SharedArray + bắn tin + đo
#   3) check-db-loadtest.mjs — đếm tin đã persist trong Postgres
#
# groupId + số token hợp lệ được RÚT THẲNG từ .loadtest-data.json sau bước 1, nên bước 3
# tự có GROUP_ID/EXPECTED đúng — không phải copy tay.
#
# Mọi biến môi trường của 2 script con đều truyền xuyên qua (NUM_USERS, BASE_URL, WS_URL,
# SETTLE_MS, CONNECT_GRACE_MS, MSG_PER_USER, SEND_BATCH, ...). Ví dụ:
#   scripts/run-loadtest.sh
#   NUM_USERS=5000 SETTLE_MS=90000 CONNECT_GRACE_MS=60000 scripts/run-loadtest.sh
#   BASE_URL=http://localhost:8080 WS_URL=ws://localhost:8080/ws scripts/run-loadtest.sh
#
# Quy ước exit: prepare lỗi -> dừng ngay (không đo lung tung). k6 fail threshold KHÔNG
# chặn bước check-DB (vẫn cần xem persistence); exit code cuối = exit code của k6.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DATA_FILE="scripts/.loadtest-data.json"
MSG_PER_USER="${MSG_PER_USER:-1}"

bar() { printf '\n\033[1;36m==== %s ====\033[0m\n' "$1"; }

# ── 1) PREPARE ───────────────────────────────────────────────────────────────
bar "1/3 PREPARE (login + tạo group)"
node scripts/loadtest-prepare.mjs

# Rút groupId + số token hợp lệ từ file vừa ghi (node có sẵn, khỏi cần jq).
GROUP_ID="$(node -pe "JSON.parse(require('fs').readFileSync('$DATA_FILE','utf8')).groupId")"
VALID="$(node -pe "JSON.parse(require('fs').readFileSync('$DATA_FILE','utf8')).tokens.filter(Boolean).length")"
EXPECTED=$(( VALID * MSG_PER_USER ))
printf '\033[2m[run] groupId=%s | tokens hợp lệ=%s | EXPECTED=%s\033[0m\n' "$GROUP_ID" "$VALID" "$EXPECTED"

# ── 2) K6 ────────────────────────────────────────────────────────────────────
bar "2/3 K6 (load test)"
K6_EXIT=0
k6 run scripts/load-test-group-chat.k6.js || K6_EXIT=$?
if [ "$K6_EXIT" -ne 0 ]; then
  printf '\033[1;33m[run] k6 thoát mã %s (thường là fail threshold) — vẫn chạy tiếp check-DB để xem persistence.\033[0m\n' "$K6_EXIT"
fi

# ── 3) CHECK DB ──────────────────────────────────────────────────────────────
bar "3/3 CHECK DB (Postgres persistence)"
GROUP_ID="$GROUP_ID" EXPECTED="$EXPECTED" node scripts/check-db-loadtest.mjs

bar "XONG"
exit "$K6_EXIT"

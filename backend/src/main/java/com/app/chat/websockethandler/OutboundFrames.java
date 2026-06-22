package com.app.chat.websockethandler;

import java.util.List;

/**
 * Dựng frame WS ra dây — DÙNG CHUNG giữa {@link OutboundCoalescer} (đường direct/cross-group,
 * conflation per-session) và {@link GroupBroadcaster} (đường group, build-once per group/cửa sổ).
 * <p>
 * Để format frame chỉ định nghĩa MỘT nơi: nếu sửa wrapper BATCH thì cả hai đường đổi cùng lúc,
 * tránh phân kỳ khiến client decode sai.
 */
final class OutboundFrames {

    private OutboundFrames() {
    }

    /**
     * 1 tin -> gửi raw y như cũ (frame lẻ KHÔNG đổi format).
     * Nhiều tin -> bọc bằng cách NỐI chuỗi (mỗi payload đã là JSON hợp lệ) => tránh parse+serialize lại N lần.
     */
    static String batch(List<String> batch) {
        if (batch.size() == 1) {
            return batch.get(0);
        }
        StringBuilder sb = new StringBuilder(batch.size() * 64);
        sb.append("{\"type\":\"BATCH\",\"messages\":[");
        for (int i = 0; i < batch.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(batch.get(i));
        }
        sb.append("]}");
        return sb.toString();
    }
}

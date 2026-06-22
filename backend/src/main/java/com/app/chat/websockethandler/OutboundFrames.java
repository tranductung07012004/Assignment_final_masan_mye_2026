package com.app.chat.websockethandler;

import java.util.List;

final class OutboundFrames {

    private OutboundFrames() {
    }

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

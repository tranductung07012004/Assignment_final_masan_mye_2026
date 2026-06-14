package com.app.chat.websockethandler;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LocalSessionManagement {

    // Lý do vì sao có cái này notion:
    // https://www.notion.so/Gi-i-th-ch-l-do-cho-s-t-n-t-i-c-a-localSessions-v-userChannels-3792a77150888037b0b8fab8b668c1a4?source=copy_link
    // sessionsByUser thay cho localSessions cũ (userId -> session), giờ là userId -> (deviceId -> session) để support multi-device
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, WebSocketSession>> sessionsByUser
            = new ConcurrentHashMap<>();

    public boolean register(String userId, String deviceId, WebSocketSession session) {
        // computeIfAbsent co nghia la neu khong co thi chay cai ham lambda,
        // co co nghia la insert cai ConcurrentHashMap vao sessionsByUser
        // neu co roi thi lay value ra dung
        // computeIfAbsent thi thread-safe
        ConcurrentHashMap<String, WebSocketSession> deviceSessions =
                sessionsByUser.computeIfAbsent(userId, i -> new ConcurrentHashMap<>());

        boolean firstDeviceOfUserToConnect = deviceSessions.isEmpty();
        deviceSessions.put(deviceId, session);
        return firstDeviceOfUserToConnect;
    }

    public boolean unregister(String userId, String deviceId, WebSocketSession session) {
        ConcurrentHashMap<String, WebSocketSession> deviceSessions = sessionsByUser.get(userId);
        if (deviceSessions == null) {
            return false;
        }

        deviceSessions.remove(deviceId, session);

        // Remove xong ma thay deviceSessions rong,
        // thi co nghia la user nay ngung connect tren moi device
        // remove luon sessionByUser.
        // remove luon userChannels.
        // va remove channel trong redis pubsub
        if (deviceSessions.isEmpty()) {
            sessionsByUser.remove(userId, deviceSessions);
            return true;
        }
        return false;
    }

    public Set<String> getOnlineUserIds() {
        return sessionsByUser.keySet();
    }

    public ConcurrentHashMap<String, WebSocketSession> getDeviceSessions(String userId) {
        return sessionsByUser.get(userId);
    }
}

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

        // So sanh theo getId() thay vi theo object: session luu trong map la
        // ConcurrentWebSocketSessionDecorator (boc o afterConnectionEstablished), con tham so 'session'
        // o day la session goc Spring truyen vao luc dong ket noi -> 2 object khac nhau.
        // remove(deviceId, session) theo object se KHONG khop -> khong xoa duoc.
        // Decorator uy quyen getId() ve session goc nen so sanh theo id van dung,
        // dong thoi van giu duoc tinh chat "chi xoa neu dung session hien tai" (tranh xoa nham session moi luc reconnect).
        WebSocketSession current = deviceSessions.get(deviceId);
        if (current != null && current.getId().equals(session.getId())) {
            deviceSessions.remove(deviceId, current);
        }

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

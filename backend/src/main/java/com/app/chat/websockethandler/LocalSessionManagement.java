package com.app.chat.websockethandler;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LocalSessionManagement {

    private final ConcurrentHashMap<String, ConcurrentHashMap<String, WebSocketSession>> sessionsByUser
            = new ConcurrentHashMap<>();

    public boolean register(String userId, String deviceId, WebSocketSession session) {
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

        WebSocketSession current = deviceSessions.get(deviceId);
        if (current != null && current.getId().equals(session.getId())) {
            deviceSessions.remove(deviceId, current);
        }

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

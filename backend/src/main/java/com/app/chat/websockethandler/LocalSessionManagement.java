package com.app.chat.websockethandler;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LocalSessionManagement {

    // userId -> (connectionId -> session). A connectionId is unique per browser tab,
    // so one user can hold many concurrent connections (multiple tabs and/or devices).
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, WebSocketSession>> sessionsByUser
            = new ConcurrentHashMap<>();

    public boolean register(String userId, String connectionId, WebSocketSession session) {
        ConcurrentHashMap<String, WebSocketSession> connections =
                sessionsByUser.computeIfAbsent(userId, i -> new ConcurrentHashMap<>());

        boolean firstConnectionOfUser = connections.isEmpty();
        connections.put(connectionId, session);
        return firstConnectionOfUser;
    }

    public boolean unregister(String userId, String connectionId, WebSocketSession session) {
        ConcurrentHashMap<String, WebSocketSession> connections = sessionsByUser.get(userId);
        if (connections == null) {
            return false;
        }

        WebSocketSession current = connections.get(connectionId);
        if (current != null && current.getId().equals(session.getId())) {
            connections.remove(connectionId, current);
        }

        if (connections.isEmpty()) {
            sessionsByUser.remove(userId, connections);
            return true;
        }
        return false;
    }

    public Set<String> getOnlineUserIds() {
        return sessionsByUser.keySet();
    }

    public ConcurrentHashMap<String, WebSocketSession> getUserConnections(String userId) {
        return sessionsByUser.get(userId);
    }
}

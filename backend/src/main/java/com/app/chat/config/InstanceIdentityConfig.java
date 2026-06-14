package com.app.chat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class InstanceIdentityConfig {

    private final String serverId;

    public InstanceIdentityConfig(@Value("${HOSTNAME:}") String hostname) {
        if (hostname != null && !hostname.trim().isEmpty()) {
            this.serverId = hostname.trim();
        } else {
            this.serverId = "server-" + UUID.randomUUID().toString().substring(0, 8);
        }
    }

    public String getServerId() {
        return serverId;
    }
}

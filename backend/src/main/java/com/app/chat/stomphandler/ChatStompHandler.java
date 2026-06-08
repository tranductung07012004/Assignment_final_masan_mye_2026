package com.app.chat.stomphandler;


import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatStompHandler extends TextWebSocketHandler {

    private final static Logger logger = LoggerFactory.getLogger(ChatStompHandler.class);

}

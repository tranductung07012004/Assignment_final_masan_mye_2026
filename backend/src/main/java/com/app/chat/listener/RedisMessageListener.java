package com.app.chat.listener;

import com.app.chat.websockethandler.ChatHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
public class RedisMessageListener implements MessageListener {

    private static final Logger logger = LoggerFactory.getLogger(RedisMessageListener.class);
    private static final String USER_CHANNEL_PREFIX = "user:";

    private final ChatHandler chatHandler;

    // SU dung @Lazy o day la vi co circular dependency injection giua chatHandler va RedisMessageListener
    // Neu khong dung thi app khong build duoc, loi compile time
    // No throw ra org.springframework.beans.factory.BeanCurrentlyInCreationException
    public RedisMessageListener(@Lazy ChatHandler chatHandler) {
        this.chatHandler = chatHandler;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        /**
         Su dung StandardCharsets.UTF_8 cho nay li do la vi:
         Websocket chi truyen tai du lieu tho la byte[]
         nen phai co bo tu dien UTF_8 de new String() dich nguoc no thanh text cho chung ta xem
         tranh loi doc chu nay ra chu no
         Vi du chung ta viet don gian: new String(message.getChannel())
         thi java se dung Default charset cua he dieu hanh luc no chay, vi the deploy
         o nhieu moi truong khac nhau (Winsdow server, Linux server) co the gay loi hien thi
         Ngoai ra, viec lua chon charset la UTF_8 la vi UTF_8 la charset best practice
         no duoc dung o rat nhieu chat app production vi
         UTF-8 la bang ma chuan quoc te, co kha nang ma hoa
         duoc tat ca cac ky tu tren the gioi, bao gom ca emoji

         UTF_8 duoc cai san (mac dinh) ben trong JVM
         nen se khong lo truong hop la no khong ton tai o noi deploy
         (co the la windows server khong co UTF_8 chang han)
         **/
        String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
        if (!channel.startsWith(USER_CHANNEL_PREFIX)) {
            logger.warn("Ignoring message on unexpected channel: {}", channel);
            return;
        }

        String userId = channel.substring(USER_CHANNEL_PREFIX.length());
        String payload = new String(message.getBody(), StandardCharsets.UTF_8);
        chatHandler.pushToLocalSession(userId, payload);
    }
}

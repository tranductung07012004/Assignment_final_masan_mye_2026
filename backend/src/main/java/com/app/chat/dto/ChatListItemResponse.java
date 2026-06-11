package com.app.chat.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatListItemResponse {
    private Long groupId;
    private String type;
    private String title;
    private String avatarUrl; // avatar of the chat, if the chat is PRIVATE 1-1, then the avatarUrl would be the avatar of the peerMember, if the chat is GROUP then it would be the group avatar. 
    private Long peerId;     // Populated only for PRIVATE chats — the other participant's user ID. Null for GROUP chats. 
}

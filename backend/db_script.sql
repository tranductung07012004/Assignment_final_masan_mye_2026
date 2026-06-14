-- =========================================
-- USERS
-- =========================================
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR NOT NULL,
    email           VARCHAR NOT NULL UNIQUE,
    hash_password   VARCHAR NOT NULL,
    avatar_url      VARCHAR,

    created_at      TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- =========================================
-- REFRESH TOKENS
-- =========================================
CREATE TABLE refresh_tokens (
    id              BIGSERIAL PRIMARY KEY,

    user_id         BIGINT NOT NULL REFERENCES users(id),

    device_id       VARCHAR NOT NULL,  -- browser client (react app) tự sinh ra UUID và save vào local storage, rồi gửi lên backend lưu. 

    hash_token      VARCHAR NOT NULL UNIQUE,

    created_at      TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(), -- TIMESTAMPTZ(0) co nghia la lam tron ve seconds

    CONSTRAINT uq_user_id_devic_id UNIQUE (user_id, device_id) --- Đảm bảo 1 browser (hay 1 thiết bị) chỉ có 1 refresh token
);

CREATE INDEX idx_refresh_tokens_hash_token
    ON refresh_tokens(hash_token);

-- =========================================
-- CHAT GROUPS
-- =========================================
CREATE TABLE chat_groups (
    id              BIGSERIAL PRIMARY KEY,

    type            VARCHAR NOT NULL,
    title           VARCHAR NOT NULL,
    avatar_url      VARCHAR,

    created_by      BIGINT NOT NULL REFERENCES users(id),

    created_at      TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_chat_groups_type
        CHECK (type IN ('PRIVATE', 'GROUP'))
);

-- =========================================
-- CHAT GROUP MEMBERS
-- =========================================
CREATE TABLE chat_group_members (
    id              BIGSERIAL PRIMARY KEY,

    group_id        BIGINT NOT NULL REFERENCES chat_groups(id),

    member_id       BIGINT NOT NULL REFERENCES users(id),

    created_by      BIGINT NOT NULL REFERENCES users(id),

    member_role     VARCHAR NOT NULL DEFAULT 'MEMBER', -- OWNER, MEMBER

    joined_at       TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_chat_group_members UNIQUE (group_id, member_id),

    CONSTRAINT chk_chat_group_members_role CHECK (member_role IN ('OWNER', 'MEMBER'))
);

CREATE INDEX idx_chat_group_members_group_id_joined_at ON chat_group_members(group_id, member_id, joined_at);

-- =========================================
-- CHAT MESSAGES
-- =========================================
CREATE TABLE chat_messages (
    id              BIGSERIAL PRIMARY KEY,

    group_id        BIGINT NOT NULL REFERENCES chat_groups(id),

    sender_id       BIGINT NOT NULL REFERENCES users(id),

    content         TEXT NOT NULL,

    message_type    VARCHAR NOT NULL DEFAULT 'TEXT',

    metadata        JSONB,

    created_at      TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    edited_at       TIMESTAMPTZ(0),
    deleted_at      TIMESTAMPTZ(0),

    CONSTRAINT chk_chat_messages_type CHECK (message_type IN ('TEXT', 'IMAGE', 'VIDEO'))
);

CREATE INDEX idx_chat_messages_group_id_created_at ON chat_messages(group_id, created_at);

CREATE INDEX idx_chat_messages_group_id_id ON chat_messages(group_id, id DESC);

-- =========================================
-- FRIEND REQUESTS
-- =========================================
CREATE TABLE friend_requests (
    id                  BIGSERIAL PRIMARY KEY,

    low_user_id         BIGINT NOT NULL REFERENCES users(id),

    high_user_id        BIGINT NOT NULL REFERENCES users(id),

    sender_id           BIGINT NOT NULL REFERENCES users(id),

    receiver_id         BIGINT NOT NULL REFERENCES users(id),

    status              VARCHAR NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED

    cooldown_at         TIMESTAMPTZ(0), --NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_friend_requests_pair UNIQUE (low_user_id, high_user_id),

    CONSTRAINT chk_friend_requests_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED'))

);

CREATE INDEX idx_friend_requests_low_user_id_high_user_id
    ON friend_requests(low_user_id, high_user_id);
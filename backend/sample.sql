-- =========================================
-- SEED DATA — tự chạy khi docker postgres khởi tạo lần đầu (sau db_script.sql)
-- Password chung: hash bcrypt bên dưới (dùng cho mọi user)

-- USERS (7)
-- =========================================
INSERT INTO users (full_name, email, hash_password, avatar_url, created_at, updated_at) VALUES
    ('Alice', 'u1@test.com', '$2a$10$OCH2X82MEtUU2kPNdBahDOcwqN3.51tCfnlynL5od9t4OJpaIkCEG', NULL, '2026-06-09 09:00:01+07', '2026-06-09 09:00:01+07'),
    ('Bob',   'u2@test.com', '$2a$10$OCH2X82MEtUU2kPNdBahDOcwqN3.51tCfnlynL5od9t4OJpaIkCEG', NULL, '2026-06-09 09:00:12+07', '2026-06-09 09:00:12+07'),
    ('Carol', 'u3@test.com', '$2a$10$OCH2X82MEtUU2kPNdBahDOcwqN3.51tCfnlynL5od9t4OJpaIkCEG', NULL, '2026-06-09 09:00:23+07', '2026-06-09 09:00:23+07'),
    ('Dave',  'u4@test.com', '$2a$10$OCH2X82MEtUU2kPNdBahDOcwqN3.51tCfnlynL5od9t4OJpaIkCEG', NULL, '2026-06-09 09:00:34+07', '2026-06-09 09:00:34+07'),
    ('Eve',   'u5@test.com', '$2a$10$OCH2X82MEtUU2kPNdBahDOcwqN3.51tCfnlynL5od9t4OJpaIkCEG', NULL, '2026-06-09 09:00:45+07', '2026-06-09 09:00:45+07'),
    ('Frank', 'u6@test.com', '$2a$10$OCH2X82MEtUU2kPNdBahDOcwqN3.51tCfnlynL5od9t4OJpaIkCEG', NULL, '2026-06-09 09:00:56+07', '2026-06-09 09:00:56+07'),
    ('Grace', 'u7@test.com', '$2a$10$OCH2X82MEtUU2kPNdBahDOcwqN3.51tCfnlynL5od9t4OJpaIkCEG', NULL, '2026-06-09 09:01:07+07', '2026-06-09 09:01:07+07');

-- =========================================
-- CHAT GROUPS
--   #1–21  PRIVATE — mọi cặp user (C(7,2) = 21), mỗi nhóm đúng 2 member
--   #22–23  GROUP    — Team Dev, Design Squad; mỗi nhóm ≥3 member, 1 OWNER
-- =========================================
INSERT INTO chat_groups (type, title, avatar_url, created_by, created_at, updated_at) VALUES
    ('PRIVATE', 'Private u1-u2', NULL, 1, '2026-06-09 10:00:01+07', '2026-06-09 10:00:01+07'),
    ('PRIVATE', 'Private u1-u3', NULL, 1, '2026-06-09 10:00:08+07', '2026-06-09 10:00:08+07'),
    ('PRIVATE', 'Private u1-u4', NULL, 1, '2026-06-09 10:00:15+07', '2026-06-09 10:00:15+07'),
    ('PRIVATE', 'Private u1-u5', NULL, 1, '2026-06-09 10:00:22+07', '2026-06-09 10:00:22+07'),
    ('PRIVATE', 'Private u1-u6', NULL, 1, '2026-06-09 10:00:29+07', '2026-06-09 10:00:29+07'),
    ('PRIVATE', 'Private u1-u7', NULL, 1, '2026-06-09 10:00:36+07', '2026-06-09 10:00:36+07'),
    ('PRIVATE', 'Private u2-u3', NULL, 2, '2026-06-09 10:00:43+07', '2026-06-09 10:00:43+07'),
    ('PRIVATE', 'Private u2-u4', NULL, 2, '2026-06-09 10:00:50+07', '2026-06-09 10:00:50+07'),
    ('PRIVATE', 'Private u2-u5', NULL, 2, '2026-06-09 10:00:57+07', '2026-06-09 10:00:57+07'),
    ('PRIVATE', 'Private u2-u6', NULL, 2, '2026-06-09 10:01:04+07', '2026-06-09 10:01:04+07'),
    ('PRIVATE', 'Private u2-u7', NULL, 2, '2026-06-09 10:01:11+07', '2026-06-09 10:01:11+07'),
    ('PRIVATE', 'Private u3-u4', NULL, 3, '2026-06-09 10:01:18+07', '2026-06-09 10:01:18+07'),
    ('PRIVATE', 'Private u3-u5', NULL, 3, '2026-06-09 10:01:25+07', '2026-06-09 10:01:25+07'),
    ('PRIVATE', 'Private u3-u6', NULL, 3, '2026-06-09 10:01:32+07', '2026-06-09 10:01:32+07'),
    ('PRIVATE', 'Private u3-u7', NULL, 3, '2026-06-09 10:01:39+07', '2026-06-09 10:01:39+07'),
    ('PRIVATE', 'Private u4-u5', NULL, 4, '2026-06-09 10:01:46+07', '2026-06-09 10:01:46+07'),
    ('PRIVATE', 'Private u4-u6', NULL, 4, '2026-06-09 10:01:53+07', '2026-06-09 10:01:53+07'),
    ('PRIVATE', 'Private u4-u7', NULL, 4, '2026-06-09 10:02:00+07', '2026-06-09 10:02:00+07'),
    ('PRIVATE', 'Private u5-u6', NULL, 5, '2026-06-09 10:02:07+07', '2026-06-09 10:02:07+07'),
    ('PRIVATE', 'Private u5-u7', NULL, 5, '2026-06-09 10:02:14+07', '2026-06-09 10:02:14+07'),
    ('PRIVATE', 'Private u6-u7', NULL, 6, '2026-06-09 10:02:21+07', '2026-06-09 10:02:21+07'),
    ('GROUP',   'Team Dev',      NULL, 1, '2026-06-09 14:00:00+07', '2026-06-09 14:00:00+07'),
    ('GROUP',   'Design Squad',  NULL, 3, '2026-06-09 15:00:00+07', '2026-06-09 15:00:00+07');

-- =========================================
-- CHAT GROUP MEMBERS
--   PRIVATE: 2 member / nhóm, cả hai MEMBER
--   GROUP:   user 1 = OWNER, còn lại MEMBER
-- =========================================
INSERT INTO chat_group_members (group_id, member_id, created_by, member_role, joined_at) VALUES
    (1,  1, 1, 'MEMBER', '2026-06-09 10:05:01+07'), (1,  2, 1, 'MEMBER', '2026-06-09 10:05:02+07'),
    (2,  1, 1, 'MEMBER', '2026-06-09 10:05:03+07'), (2,  3, 1, 'MEMBER', '2026-06-09 10:05:04+07'),
    (3,  1, 1, 'MEMBER', '2026-06-09 10:05:05+07'), (3,  4, 1, 'MEMBER', '2026-06-09 10:05:06+07'),
    (4,  1, 1, 'MEMBER', '2026-06-09 10:05:07+07'), (4,  5, 1, 'MEMBER', '2026-06-09 10:05:08+07'),
    (5,  1, 1, 'MEMBER', '2026-06-09 10:05:09+07'), (5,  6, 1, 'MEMBER', '2026-06-09 10:05:10+07'),
    (6,  1, 1, 'MEMBER', '2026-06-09 10:05:11+07'), (6,  7, 1, 'MEMBER', '2026-06-09 10:05:12+07'),
    (7,  2, 2, 'MEMBER', '2026-06-09 10:05:13+07'), (7,  3, 2, 'MEMBER', '2026-06-09 10:05:14+07'),
    (8,  2, 2, 'MEMBER', '2026-06-09 10:05:15+07'), (8,  4, 2, 'MEMBER', '2026-06-09 10:05:16+07'),
    (9,  2, 2, 'MEMBER', '2026-06-09 10:05:17+07'), (9,  5, 2, 'MEMBER', '2026-06-09 10:05:18+07'),
    (10, 2, 2, 'MEMBER', '2026-06-09 10:05:19+07'), (10, 6, 2, 'MEMBER', '2026-06-09 10:05:20+07'),
    (11, 2, 2, 'MEMBER', '2026-06-09 10:05:21+07'), (11, 7, 2, 'MEMBER', '2026-06-09 10:05:22+07'),
    (12, 3, 3, 'MEMBER', '2026-06-09 10:05:23+07'), (12, 4, 3, 'MEMBER', '2026-06-09 10:05:24+07'),
    (13, 3, 3, 'MEMBER', '2026-06-09 10:05:25+07'), (13, 5, 3, 'MEMBER', '2026-06-09 10:05:26+07'),
    (14, 3, 3, 'MEMBER', '2026-06-09 10:05:27+07'), (14, 6, 3, 'MEMBER', '2026-06-09 10:05:28+07'),
    (15, 3, 3, 'MEMBER', '2026-06-09 10:05:29+07'), (15, 7, 3, 'MEMBER', '2026-06-09 10:05:30+07'),
    (16, 4, 4, 'MEMBER', '2026-06-09 10:05:31+07'), (16, 5, 4, 'MEMBER', '2026-06-09 10:05:32+07'),
    (17, 4, 4, 'MEMBER', '2026-06-09 10:05:33+07'), (17, 6, 4, 'MEMBER', '2026-06-09 10:05:34+07'),
    (18, 4, 4, 'MEMBER', '2026-06-09 10:05:35+07'), (18, 7, 4, 'MEMBER', '2026-06-09 10:05:36+07'),
    (19, 5, 5, 'MEMBER', '2026-06-09 10:05:37+07'), (19, 6, 5, 'MEMBER', '2026-06-09 10:05:38+07'),
    (20, 5, 5, 'MEMBER', '2026-06-09 10:05:39+07'), (20, 7, 5, 'MEMBER', '2026-06-09 10:05:40+07'),
    (21, 6, 6, 'MEMBER', '2026-06-09 10:05:41+07'), (21, 7, 6, 'MEMBER', '2026-06-09 10:05:42+07'),

    -- Group 22 (GROUP — Team Dev)
    (22, 1, 1, 'OWNER',  '2026-06-09 14:01:01+07'),
    (22, 2, 1, 'MEMBER', '2026-06-09 14:01:09+07'),
    (22, 4, 1, 'MEMBER', '2026-06-09 14:01:17+07'),
    (22, 5, 1, 'MEMBER', '2026-06-09 14:01:25+07'),

    -- Group 23 (GROUP — Design Squad)
    (23, 3, 3, 'OWNER',  '2026-06-09 15:01:01+07'),
    (23, 6, 3, 'MEMBER', '2026-06-09 15:01:09+07'),
    (23, 7, 3, 'MEMBER', '2026-06-09 15:01:17+07');

-- =========================================
-- FRIEND REQUESTS (21 — mỗi cặp PRIVATE có 1 request ACCEPTED)
--   low_user_id < high_user_id; sender = low, receiver = high
--   (schema dùng ACCEPTED, không có SUCCESS)
-- =========================================
INSERT INTO friend_requests (low_user_id, high_user_id, sender_id, receiver_id, status, cooldown_at, created_at) VALUES
    (1, 2, 1, 2, 'ACCEPTED', NULL, '2026-06-09 09:30:01+07'),
    (1, 3, 1, 3, 'ACCEPTED', NULL, '2026-06-09 09:30:04+07'),
    (1, 4, 1, 4, 'ACCEPTED', NULL, '2026-06-09 09:30:07+07'),
    (1, 5, 1, 5, 'ACCEPTED', NULL, '2026-06-09 09:30:10+07'),
    (1, 6, 1, 6, 'ACCEPTED', NULL, '2026-06-09 09:30:13+07'),
    (1, 7, 1, 7, 'ACCEPTED', NULL, '2026-06-09 09:30:16+07'),
    (2, 3, 2, 3, 'ACCEPTED', NULL, '2026-06-09 09:30:19+07'),
    (2, 4, 2, 4, 'ACCEPTED', NULL, '2026-06-09 09:30:22+07'),
    (2, 5, 2, 5, 'ACCEPTED', NULL, '2026-06-09 09:30:25+07'),
    (2, 6, 2, 6, 'ACCEPTED', NULL, '2026-06-09 09:30:28+07'),
    (2, 7, 2, 7, 'ACCEPTED', NULL, '2026-06-09 09:30:31+07'),
    (3, 4, 3, 4, 'ACCEPTED', NULL, '2026-06-09 09:30:34+07'),
    (3, 5, 3, 5, 'ACCEPTED', NULL, '2026-06-09 09:30:37+07'),
    (3, 6, 3, 6, 'ACCEPTED', NULL, '2026-06-09 09:30:40+07'),
    (3, 7, 3, 7, 'ACCEPTED', NULL, '2026-06-09 09:30:43+07'),
    (4, 5, 4, 5, 'ACCEPTED', NULL, '2026-06-09 09:30:46+07'),
    (4, 6, 4, 6, 'ACCEPTED', NULL, '2026-06-09 09:30:49+07'),
    (4, 7, 4, 7, 'ACCEPTED', NULL, '2026-06-09 09:30:52+07'),
    (5, 6, 5, 6, 'ACCEPTED', NULL, '2026-06-09 09:30:55+07'),
    (5, 7, 5, 7, 'ACCEPTED', NULL, '2026-06-09 09:30:58+07'),
    (6, 7, 6, 7, 'ACCEPTED', NULL, '2026-06-09 09:31:01+07');

-- =========================================
-- CHAT MESSAGES (mẫu — private u1-u2 + 2 group)
-- =========================================
INSERT INTO chat_messages (group_id, sender_id, content, message_type, metadata, created_at, edited_at, deleted_at) VALUES
    (1,  1, 'Chao Bob, day la chat rieng u1-u2.', 'TEXT', NULL, '2026-06-09 11:05:04+07', '2026-06-09 11:05:04+07', NULL),
    (1,  2, 'Chao Alice, nhan duoc roi.',          'TEXT', NULL, '2026-06-09 11:05:17+07', '2026-06-09 11:05:17+07', NULL),
    (1,  1, 'Test direct message ok.',             'TEXT', NULL, '2026-06-09 11:05:31+07', '2026-06-09 11:05:31+07', NULL),

    (22, 1, 'Welcome to Team Dev!',                'TEXT', NULL, '2026-06-09 14:10:06+07', '2026-06-09 14:10:06+07', NULL),
    (22, 2, 'Thanks owner!',                       'TEXT', NULL, '2026-06-09 14:10:22+07', '2026-06-09 14:10:22+07', NULL),
    (22, 4, 'Dave checking in.',                   'TEXT', NULL, '2026-06-09 14:10:38+07', '2026-06-09 14:10:38+07', NULL),
    (22, 5, 'Eve here, group chat works.',         'TEXT', NULL, '2026-06-09 14:10:54+07', '2026-06-09 14:10:54+07', NULL),

    (23, 3, 'Design Squad is live!',               'TEXT', NULL, '2026-06-09 15:10:06+07', '2026-06-09 15:10:06+07', NULL),
    (23, 6, 'Frank joined, hello everyone.',       'TEXT', NULL, '2026-06-09 15:10:19+07', '2026-06-09 15:10:19+07', NULL),
    (23, 7, 'Grace here, nice to meet you all.',   'TEXT', NULL, '2026-06-09 15:10:33+07', '2026-06-09 15:10:33+07', NULL);

UPDATE chat_group_members cgm
SET last_read_msg_id = (SELECT MAX(cm.id) FROM chat_messages cm WHERE cm.group_id = cgm.group_id);

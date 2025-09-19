-- Create notifications table manually
CREATE TABLE IF NOT EXISTS notifications_notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(10) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(200),
    action_text VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_notifications_user 
        FOREIGN KEY (user_id) 
        REFERENCES users_usermodel(id) 
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS notificatio_user_id_8b2b0b_idx ON notifications_notification(user_id, read);
CREATE INDEX IF NOT EXISTS notificatio_user_id_4b8c8a_idx ON notifications_notification(user_id, created_at);
CREATE INDEX IF NOT EXISTS notificatio_type_2c8c8a_idx ON notifications_notification(type, created_at);
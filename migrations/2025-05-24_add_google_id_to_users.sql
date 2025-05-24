-- Migration: Add google_id column to users table for Google+PIN parent registration
ALTER TABLE users ADD COLUMN google_id VARCHAR(128) DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

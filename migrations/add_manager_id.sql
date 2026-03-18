-- Add manager_id to users table
-- Run this in your Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Index for fast manager lookups
CREATE INDEX IF NOT EXISTS users_manager_id_idx ON users(manager_id);

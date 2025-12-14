-- Migration: 004_add_user_role.sql
-- Description: Add role field to users table for admin access control

-- Add role column with default 'user'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create admin_settings table for system configuration
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for admin_logs
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);

-- Insert default admin settings
INSERT INTO admin_settings (key, value, description) VALUES
('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
('max_daily_alerts', '100', 'Maximum daily alerts per user'),
('symbol_sync_interval', '3600', 'Symbol sync interval in seconds'),
('price_update_interval', '10', 'Price update interval in seconds'),
('alert_threshold_min', '0.01', 'Minimum alert threshold'),
('alert_threshold_max', '10.0', 'Maximum alert threshold')
ON CONFLICT (key) DO NOTHING;

COMMENT ON COLUMN users.role IS 'User role: user, admin';
COMMENT ON TABLE admin_settings IS 'System-wide admin configuration settings';
COMMENT ON TABLE admin_logs IS 'Audit log for admin actions';


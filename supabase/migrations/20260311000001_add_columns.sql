-- Add missing columns to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS authorized_by TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS authorized_position TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS authorized_justification TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS urgency TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS professionals JSONB DEFAULT '[]'::jsonb;

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL,
  last_maintenance TEXT,
  next_maintenance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access for now (demo purposes)
CREATE POLICY "Allow all access to assets" ON assets
  FOR ALL
  USING (true)
  WITH CHECK (true);

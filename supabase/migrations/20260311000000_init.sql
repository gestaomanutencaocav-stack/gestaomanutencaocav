-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  responsible_server TEXT,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  status_color TEXT NOT NULL,
  professional TEXT,
  avatar TEXT,
  details TEXT,
  checklist JSONB DEFAULT '[]'::jsonb
);

-- Enable Row Level Security
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access for now (demo purposes)
-- In a real app, you'd restrict this based on auth.uid()
CREATE POLICY "Allow all access" ON requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

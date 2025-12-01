-- Create top_procedures_daily table
-- This table stores daily top procedures performed at the practice

CREATE TABLE IF NOT EXISTS top_procedures_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_date DATE NOT NULL,
  procedure_name TEXT NOT NULL,
  procedure_code TEXT,
  count INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure we can query by date efficiently
  CONSTRAINT top_procedures_daily_date_idx UNIQUE (procedure_date, procedure_name, procedure_code)
);

-- Create index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_top_procedures_date ON top_procedures_daily(procedure_date DESC);

-- Create index for faster queries by revenue (for top N)
CREATE INDEX IF NOT EXISTS idx_top_procedures_revenue ON top_procedures_daily(procedure_date, revenue DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE top_procedures_daily ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all procedures
CREATE POLICY "Allow authenticated users to read top procedures"
  ON top_procedures_daily
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert procedures
CREATE POLICY "Allow authenticated users to insert top procedures"
  ON top_procedures_daily
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update procedures
CREATE POLICY "Allow authenticated users to update top procedures"
  ON top_procedures_daily
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to delete procedures
CREATE POLICY "Allow authenticated users to delete top procedures"
  ON top_procedures_daily
  FOR DELETE
  TO authenticated
  USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_top_procedures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_top_procedures_timestamp ON top_procedures_daily;
CREATE TRIGGER update_top_procedures_timestamp
  BEFORE UPDATE ON top_procedures_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_top_procedures_updated_at();

-- Add helpful comment
COMMENT ON TABLE top_procedures_daily IS 'Stores daily top procedures performed with counts and revenue';
COMMENT ON COLUMN top_procedures_daily.procedure_date IS 'Date when the procedure was performed';
COMMENT ON COLUMN top_procedures_daily.procedure_name IS 'Name of the dental procedure';
COMMENT ON COLUMN top_procedures_daily.procedure_code IS 'ADA procedure code (e.g., D2740)';
COMMENT ON COLUMN top_procedures_daily.count IS 'Number of times this procedure was performed';
COMMENT ON COLUMN top_procedures_daily.revenue IS 'Total revenue generated from this procedure';

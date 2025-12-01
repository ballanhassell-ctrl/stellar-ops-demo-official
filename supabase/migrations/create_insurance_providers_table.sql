-- Create insurance_providers table
-- This table stores insurance provider information including network status for each doctor

CREATE TABLE IF NOT EXISTS insurance_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  fee_schedule TEXT NOT NULL, -- 'Direct', 'Connection', or 'Decare'
  portal_status TEXT NOT NULL DEFAULT 'All Set!',
  eft_status TEXT NOT NULL DEFAULT 'Enrolled',
  dr_gajjar_network TEXT NOT NULL DEFAULT 'In', -- 'In' or 'Out'
  dr_judge_network TEXT NOT NULL DEFAULT 'In', -- 'In' or 'Out'
  dr_strachan_network TEXT NOT NULL DEFAULT 'In', -- 'In' or 'Out'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fee_schedule_check CHECK (fee_schedule IN ('Direct', 'Connection', 'Decare')),
  CONSTRAINT dr_gajjar_check CHECK (dr_gajjar_network IN ('In', 'Out')),
  CONSTRAINT dr_judge_check CHECK (dr_judge_network IN ('In', 'Out')),
  CONSTRAINT dr_strachan_check CHECK (dr_strachan_network IN ('In', 'Out'))
);

-- Create index for faster queries by name
CREATE INDEX IF NOT EXISTS idx_insurance_providers_name ON insurance_providers(name);

-- Create index for network status queries
CREATE INDEX IF NOT EXISTS idx_insurance_providers_network ON insurance_providers(
  dr_gajjar_network,
  dr_judge_network,
  dr_strachan_network
);

-- Add RLS (Row Level Security) policies
ALTER TABLE insurance_providers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all providers
CREATE POLICY "Allow authenticated users to read insurance providers"
  ON insurance_providers
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert providers
CREATE POLICY "Allow authenticated users to insert insurance providers"
  ON insurance_providers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update providers
CREATE POLICY "Allow authenticated users to update insurance providers"
  ON insurance_providers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to delete providers
CREATE POLICY "Allow authenticated users to delete insurance providers"
  ON insurance_providers
  FOR DELETE
  TO authenticated
  USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_insurance_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_insurance_providers_timestamp ON insurance_providers;
CREATE TRIGGER update_insurance_providers_timestamp
  BEFORE UPDATE ON insurance_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_insurance_providers_updated_at();

-- Add helpful comments
COMMENT ON TABLE insurance_providers IS 'Stores insurance provider information and network status for each doctor';
COMMENT ON COLUMN insurance_providers.name IS 'Name of the insurance provider (e.g., Aetna, Cigna)';
COMMENT ON COLUMN insurance_providers.fee_schedule IS 'Fee schedule type: Direct, Connection, or Decare';
COMMENT ON COLUMN insurance_providers.portal_status IS 'Status of portal access';
COMMENT ON COLUMN insurance_providers.eft_status IS 'Electronic funds transfer enrollment status';
COMMENT ON COLUMN insurance_providers.dr_gajjar_network IS 'Dr. Gajjar network status (In/Out)';
COMMENT ON COLUMN insurance_providers.dr_judge_network IS 'Dr. Judge network status (In/Out)';
COMMENT ON COLUMN insurance_providers.dr_strachan_network IS 'Dr. Strachan network status (In/Out)';

-- Insert default insurance providers
INSERT INTO insurance_providers (name, fee_schedule, portal_status, eft_status, dr_gajjar_network, dr_judge_network, dr_strachan_network) VALUES
  ('Aetna', 'Direct', 'All Set!', 'Enrolled', 'In', 'In', 'In'),
  ('Cigna', 'Connection', 'All Set!', 'Enrolled', 'In', 'In', 'In'),
  ('Delta Dental Insurance', 'Direct', 'All Set!', 'Enrolled', 'Out', 'Out', 'Out'),
  ('MetLife', 'Connection', 'All Set!', 'Enrolled', 'In', 'In', 'In'),
  ('Anthem BCBS', 'Decare', 'All Set!', 'Enrolled', 'In', 'In', 'In'),
  ('United Healthcare (Optum ID)', 'Connection', 'All Set!', 'Enrolled', 'Out', 'Out', 'Out'),
  ('Guardian', 'Connection', 'All Set!', 'Enrolled', 'Out', 'Out', 'Out'),
  ('Humana', 'Direct', 'All Set!', 'Enrolled', 'In', 'In', 'In'),
  ('Ameritas', 'Direct', 'All Set!', 'Enrolled', 'In', 'In', 'In'),
  ('Principal', 'Direct', 'All Set!', 'Enrolled', 'In', 'In', 'In'),
  ('Beam Benefits', 'Direct', 'All Set!', 'Enrolled', 'In', 'In', 'In')
ON CONFLICT (name) DO UPDATE SET
  fee_schedule = EXCLUDED.fee_schedule,
  portal_status = EXCLUDED.portal_status,
  eft_status = EXCLUDED.eft_status,
  dr_gajjar_network = EXCLUDED.dr_gajjar_network,
  dr_judge_network = EXCLUDED.dr_judge_network,
  dr_strachan_network = EXCLUDED.dr_strachan_network,
  updated_at = NOW();

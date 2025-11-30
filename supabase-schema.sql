-- Supabase SQL Schema for Patient Lifecycle Tracking
-- Run this in your Supabase SQL Editor to create the required tables

-- =====================================================
-- PATIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS patients (
  patient_id TEXT PRIMARY KEY,
  first_visit_date DATE NOT NULL,
  last_visit_date DATE,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'churned')),
  total_lifetime_revenue DECIMAL(10, 2) DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_last_visit ON patients(last_visit_date);

-- =====================================================
-- APPOINTMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  provider_name TEXT,
  production_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('completed', 'no_show', 'cancelled', 'scheduled')),
  procedure_codes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- =====================================================
-- PATIENT REVENUE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS patient_revenue (
  id BIGSERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'adjustment', 'writeoff', 'production')),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_patient_revenue_patient ON patient_revenue(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_revenue_date ON patient_revenue(transaction_date);
CREATE INDEX IF NOT EXISTS idx_patient_revenue_type ON patient_revenue(transaction_type);

-- =====================================================
-- LIFECYCLE METRICS TABLE (Stores calculated metrics)
-- =====================================================
CREATE TABLE IF NOT EXISTS lifecycle_metrics (
  id BIGSERIAL PRIMARY KEY,
  calculation_date DATE NOT NULL UNIQUE,
  avg_patient_lifecycle_months DECIMAL(10, 2) DEFAULT 0,
  avg_patient_lifecycle_years DECIMAL(10, 2) DEFAULT 0,
  active_patients_prior_month INTEGER DEFAULT 0,
  avg_retention_period_months DECIMAL(10, 2) DEFAULT 0,
  average_revenue_per_client DECIMAL(10, 2) DEFAULT 0,
  lifetime_value DECIMAL(10, 2) DEFAULT 0,
  total_active_patients INTEGER DEFAULT 0,
  total_churned_patients INTEGER DEFAULT 0,
  churn_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lifecycle_metrics_date ON lifecycle_metrics(calculation_date);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for patients table
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS and create policies as needed
-- =====================================================

-- Enable RLS on tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication setup)
-- For now, allowing all operations with authenticated users

CREATE POLICY "Enable read access for all authenticated users" ON patients
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable insert access for all authenticated users" ON patients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable update access for all authenticated users" ON patients
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable delete access for all authenticated users" ON patients
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read access for all authenticated users" ON appointments
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable insert access for all authenticated users" ON appointments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable update access for all authenticated users" ON appointments
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable delete access for all authenticated users" ON appointments
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read access for all authenticated users" ON patient_revenue
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable insert access for all authenticated users" ON patient_revenue
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable update access for all authenticated users" ON patient_revenue
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable delete access for all authenticated users" ON patient_revenue
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read access for all authenticated users" ON lifecycle_metrics
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable insert access for all authenticated users" ON lifecycle_metrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable update access for all authenticated users" ON lifecycle_metrics
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable delete access for all authenticated users" ON lifecycle_metrics
  FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- =====================================================
-- SAMPLE DATA (OPTIONAL - Remove if not needed)
-- =====================================================

-- Uncomment below to insert sample data for testing
/*
INSERT INTO patients (patient_id, first_visit_date, last_visit_date, status, total_lifetime_revenue, total_visits)
VALUES
  ('P001', '2023-01-15', '2025-11-25', 'active', 3500.00, 12),
  ('P002', '2023-03-20', '2024-06-10', 'churned', 1200.00, 4),
  ('P003', '2024-06-01', '2025-11-28', 'active', 2800.00, 8);
*/

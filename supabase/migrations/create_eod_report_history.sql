-- EOD Report History table
-- Tracks all sent EOD reports for audit and scheduling purposes
-- Part of the MSO platform evolution: enables multi-practice report tracking

CREATE TABLE IF NOT EXISTS eod_report_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT NOT NULL,
  template TEXT DEFAULT 'full',
  delivery_method TEXT NOT NULL DEFAULT 'postmark',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by TEXT DEFAULT 'system',
  -- Snapshot of key metrics at send time (for historical accuracy)
  snapshot JSONB DEFAULT '{}',
  -- Scheduling metadata
  schedule_id UUID DEFAULT NULL,
  is_scheduled BOOLEAN DEFAULT FALSE,
  -- MSO fields (for future multi-practice support)
  practice_id TEXT DEFAULT 'stellar-dental-spa',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient date-range queries
CREATE INDEX IF NOT EXISTS idx_eod_report_history_date ON eod_report_history(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_eod_report_history_practice ON eod_report_history(practice_id, report_date DESC);

-- EOD Report Schedules table
-- Stores scheduled report configurations
CREATE TABLE IF NOT EXISTS eod_report_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  subject_template TEXT NOT NULL DEFAULT 'EOD Report - {{practice_name}}',
  report_template TEXT NOT NULL DEFAULT 'full',
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  send_time TIME NOT NULL DEFAULT '17:00',
  send_day_of_week INTEGER DEFAULT NULL, -- 0=Sunday, 1=Monday, etc. (for weekly)
  send_day_of_month INTEGER DEFAULT NULL, -- 1-28 (for monthly)
  is_active BOOLEAN DEFAULT TRUE,
  practice_id TEXT DEFAULT 'stellar-dental-spa',
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eod_report_schedules_active ON eod_report_schedules(is_active, practice_id);

-- =====================================================
-- Migration: Add has_planned_treatment to patient_credits
-- Tracks patients with additional planned treatment that
-- could utilize their credits (scheduling opportunities).
-- =====================================================

ALTER TABLE patient_credits
  ADD COLUMN IF NOT EXISTS has_planned_treatment BOOLEAN DEFAULT FALSE;

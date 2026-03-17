-- =====================================================
-- Patient A/R Seed Data
-- Imported from original CSV tracking spreadsheet
-- =====================================================
--
-- PREREQUISITES:
--   1. The patient_ar table must exist (20250101_patient_ar_management.sql)
--   2. The revamp migration must be applied (revamp_patient_ar_table.sql)
--
-- HOW TO RUN:
--   Paste this entire script into the Supabase SQL Editor and click "Run".
--   This should only be run ONCE to avoid duplicate records.
--
-- NOTES ON DATE MAPPING:
--   - Where the CSV said "Multiple", the earliest or most relevant date was used.
--   - Where the CSV said "See notes", a date from the notes was used.
--   - All contact dates of "1/15/25" are mapped to 2025-01-15.
-- =====================================================

BEGIN;

-- =====================================================
-- COLLECTIBLE ACCOUNTS (is_collectible = true)
-- =====================================================

INSERT INTO patient_ar (
  patient_name, related_family, dos, current_balance, original_balance,
  background_notes, status, is_collectible,
  first_contact_date, first_contact_initials,
  second_contact_date, second_contact_initials,
  final_contact_date, final_contact_initials,
  team_discussion_notes, action_needed, dr_decision,
  write_off_suggested_date, write_off_reason,
  collected_amount, created_by, updated_by
) VALUES

-- 1. Abdul-Azim, Asha
(
  'Abdul-Azim, Asha', NULL, '2025-06-18', 380.59, 380.59,
  'Patient has balance due from procedures.',
  '1st_contact_made', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  NULL, 'Contact patient', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 2. Ahn, Esther
(
  'Ahn, Esther', NULL, '2025-07-11', 415.30, 415.30,
  'Balance from Missed Appointment Fees & SRP.',
  '1st_contact_made', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  'I think she paid, I''ll confirm with patient and collect cancellation',
  'Contact patient', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 3. Albright, Kevin
(
  'Albright, Kevin', 'Albright, Samuel (DOS 10/06/23)', '2024-06-27', 710.00, 710.00,
  'Extraction procedure - may or may not have been collected. Family member also has balance.',
  'completed', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  'Our old lab man.',
  'Verify if collected; contact both patients', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 4. Albury, Virginia
(
  'Albury, Virginia', NULL, '2025-02-07', 247.82, 247.82,
  'Multiple appointment balances due (02/07/25, 02/21/25).',
  '1st_contact_made', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  NULL, 'Contact patient', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 5. Alexander, Kirt
(
  'Alexander, Kirt',
  'Mendoza, Shanessa (06/25/25); Alexander, Shauntia (10/13/25)',
  '2025-06-25', 206.00, 206.00,
  'FMX not covered + Missed appt fee. Income transfer completed, allocations corrected.',
  '1st_contact_made', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  NULL, 'Contact guarantor', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 6. Allen, Alanis
(
  'Allen, Alanis', NULL, '2025-10-01', 30.70, 30.70,
  'Small balance - should be easily collectible.',
  '1st_contact_made', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  NULL, 'Contact patient', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 7. Allen, Cynthia*
(
  'Allen, Cynthia*', NULL, '2025-11-17', 1170.50, 1170.50,
  'Received itemized statement 11/17/25. Previously paid with Cherry. Balance still outstanding.',
  'not_started', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  NULL, 'Follow up on Cherry balance', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 8. Allen-Perkins, Delores*
(
  'Allen-Perkins, Delores*', NULL, '2025-10-10', 1386.00, 1386.00,
  'HIGH BALANCE - Insurance did not cover due to same-day billing restrictions. Cannot appeal. Consider patient options.',
  'pending_writeoff', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  'Signed TX plan - adjustment $1025',
  'Discuss payment options', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 9. Anderson, Vanessa
(
  'Anderson, Vanessa', NULL, '2025-07-23', 352.50, 352.50,
  'No coverage for D4212 (same-day restriction) + additional co-insurance for other procedures.',
  '1st_contact_made', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  NULL, 'Contact patient', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 10. Anglin, Judith*
(
  'Anglin, Judith*', NULL, '2025-01-01', 6820.93, 6820.93,
  'HIGH BALANCE - On payment plan but no payments since 11/05/25. Discuss Cherry or other options.',
  'high_balance_alert', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  'Patient is on a payment plan and was away, pt''s daughter is going to pay Dec and Jan payment on Jan 19th',
  'Discuss payment alternatives', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 11. Anjum, Aisha
(
  'Anjum, Aisha', NULL, '2024-02-05', 662.00, 662.00,
  'Patient has balance due from Consult n/c by insurance.',
  '1st_contact_made', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  'Completed',
  'Patient may not pay, since this balance is very old, however, it might be worth a try since it''s not a large amount.',
  NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 12. Arana, Lauren (PAID)
(
  'Arana, Lauren', NULL, '2024-07-03', 40.00, 40.00,
  'Co-Insurance due from DOS 07/03/24 recall appointment.',
  'paid', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  'Completed',
  'Daniely, please review, patient had ASO insurance.',
  NULL,
  NULL, NULL, 40.00, 'staff', 'staff'
),

-- 13. Arndt, Mia
(
  'Arndt, Mia', NULL, '2025-01-01', 244.40, 244.40,
  'Patient has balances due to SRP/Laser completed. Aetna processed her claims as OON.',
  '1st_contact_made', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  NULL, 'Contact patient', NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 14. Arroyo, Raquel
(
  'Arroyo, Raquel', NULL, '2025-06-24', 623.00, 623.00,
  'Patient did not have claim created for DOS 11/24/25, unsure if this was to be paid in full by patient or submitted to insurance. "Interim" partial denture. Also balance due from DOS 06/24/25 (DD payment was sent to patient).',
  'pending_writeoff', true,
  '2025-01-15', 'dm', NULL, NULL, NULL, NULL,
  'We''ll be writing this off; this is a dr.b pt''s',
  'Contact patient, review the background notes please. Definitely a collectible balance if treatment was rendered.',
  NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 15. Piascik, Laura
(
  'Piascik, Laura', NULL, '2025-07-28', 266.60, 266.60,
  'I just finished reviewing and closing claims for this patient. She reached her max for 2025, this should be an easy collect; Monica also left notes regarding this. Pt. should''ve been aware. BH.',
  'not_started', true,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, 'Contact Patient', NULL,
  NULL, NULL, 0, 'staff', 'staff'
);

-- =====================================================
-- NON-COLLECTIBLE ACCOUNTS (is_collectible = false)
-- Potential Write-Offs - Discuss with Dr. Gajjar
-- =====================================================

INSERT INTO patient_ar (
  patient_name, related_family, dos, current_balance, original_balance,
  background_notes, status, is_collectible,
  first_contact_date, first_contact_initials,
  second_contact_date, second_contact_initials,
  final_contact_date, final_contact_initials,
  team_discussion_notes, action_needed, dr_decision,
  write_off_suggested_date, write_off_reason,
  collected_amount, created_by, updated_by
) VALUES

-- 16. Abdel-Naby, Ramy
(
  'Abdel-Naby, Ramy', NULL, '2022-08-16', 255.00, 255.00,
  'Balance pending since 08/16/2022. Discuss for potential bad debt write-off.',
  'pending_writeoff', false,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 17. Afshar, Roxana
(
  'Afshar, Roxana', NULL, '2023-05-31', 425.00, 425.00,
  'Many contact efforts made since DOS - no response from patient.',
  'pending_writeoff', false,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 18. Alexander, Monica
(
  'Alexander, Monica', NULL, '2022-10-28', 193.00, 193.00,
  'Attempted multiple calls - no active number for patient.',
  'pending_writeoff', false,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 19. Aljomiah, Maye
(
  'Aljomiah, Maye', NULL, '2022-04-14', 98.00, 98.00,
  'Attempted to call patient multiple times. No response.',
  'pending_writeoff', false,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 20. Anderson, Michael
(
  'Anderson, Michael', NULL, '2022-05-25', 200.93, 200.93,
  'Sent multiple statements - no response from patient.',
  'pending_writeoff', false,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 21. Anorve, Petrona
(
  'Anorve, Petrona', NULL, '2022-07-11', 334.60, 334.60,
  'Only 1 statement sent to patient - however, the balance is outstanding 3.5 years (DOS 07/11/22 and 07/18/22).',
  'pending_writeoff', false,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, 0, 'staff', 'staff'
),

-- 22. Arias Rivas, Yenifer (WRITTEN OFF)
(
  'Arias Rivas, Yenifer', NULL, '2025-07-23', 75.00, 75.00,
  'Missed appointment fee - non collectible as patient was never seen.',
  'completed', false,
  NULL, NULL, NULL, NULL, NULL, NULL,
  'Written off, see ledger for details. BH.',
  NULL,
  'I deleted the account, we never meet patient',
  NULL, NULL, 0, 'staff', 'staff'
),

-- 23. Askew-Hicks, Karimah
(
  'Askew-Hicks, Karimah', NULL, '2020-01-01', 647.00, 647.00,
  'These balances are very old, more than 5 years (multiple DOS through 2020).',
  'pending_writeoff', false,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, 0, 'staff', 'staff'
);

COMMIT;

-- =====================================================
-- Summary: 23 records inserted
--   15 Collectible accounts  (total: $13,556.34)
--    8 Non-Collectible accounts (total: $2,228.53)
-- =====================================================

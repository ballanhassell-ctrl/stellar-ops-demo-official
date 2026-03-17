-- Create a public storage bucket for email logo images
-- These are referenced by URL in HTML email templates (EOD & Daily AR reports)
-- so they must be publicly accessible without authentication.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('email-assets', 'email-assets', true, 1048576)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (email clients need unauthenticated access)
CREATE POLICY "Public read access for email assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');

-- Allow authenticated app users to upload logos
CREATE POLICY "Authenticated users can upload email assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-assets');

-- Allow overwriting existing files (upsert)
CREATE POLICY "Authenticated users can update email assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'email-assets');

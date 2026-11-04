-- Add report location context without dropping or rewriting existing reports.
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS landmark VARCHAR(120);

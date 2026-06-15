-- Migration: merge metadata_json into content (2026-06-15)
-- Run via: wrangler d1 execute cms-sanity-vite --file scripts/migrate-kb-metadata.sql
--
-- For entries that have URL/imageUrl in metadata_json, append them to content.
-- This is a one-time migration after dropping the metadata_json column from the schema.

-- Step 1: Preview affected rows
SELECT id, title, content, metadata_json FROM kb_entries WHERE metadata_json IS NOT NULL AND metadata_json != '';

-- Step 2: For entries where metadata_json contains a URL, append it to content
UPDATE kb_entries
SET content = content || CASE
  WHEN json_valid(metadata_json) AND json_extract(metadata_json, '$.url') IS NOT NULL THEN
    CASE
      WHEN typeof(json_extract(metadata_json, '$.url')) = 'array' THEN
        '\n\nReferensi:\n' || (
          SELECT group_concat('- URL: ' || value, '\n')
          FROM json_each(json_extract(metadata_json, '$.url'))
        )
      ELSE '\n\nReferensi: ' || json_extract(metadata_json, '$.url')
    END || CASE
      WHEN json_extract(metadata_json, '$.imageUrl') IS NOT NULL
      THEN '\nImage: ' || json_extract(metadata_json, '$.imageUrl')
      ELSE ''
    END
  ELSE ''
END,
metadata_json = NULL
WHERE metadata_json IS NOT NULL AND metadata_json != '';

-- Step 3: Verify no more metadata_json entries
SELECT COUNT(*) AS remaining FROM kb_entries WHERE metadata_json IS NOT NULL AND metadata_json != '';

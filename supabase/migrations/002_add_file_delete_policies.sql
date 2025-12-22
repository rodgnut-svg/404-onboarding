-- Add DELETE policy for files table
-- Allow deletion if user is agency_admin OR user is the uploader

CREATE POLICY "Agency admins and uploaders can delete files"
  ON files FOR DELETE
  USING (
    -- User is agency_admin for this project
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = files.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'agency_admin'
    )
    OR
    -- User is the uploader
    files.uploader_id = auth.uid()
  );

-- Note: Storage DELETE policies should be added manually in Supabase Dashboard
-- under Storage > Policies for bucket 'project_uploads'
-- Recommended policy:
-- 
-- CREATE POLICY "Agency admins and uploaders can delete files"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'project_uploads' AND
--     (
--       -- Agency admin can delete any file in their project folder
--       EXISTS (
--         SELECT 1 FROM projects p
--         INNER JOIN project_members pm ON pm.project_id = p.id
--         WHERE p.id::text = (storage.foldername(name))[1]
--           AND pm.user_id = auth.uid()
--           AND pm.role = 'agency_admin'
--       )
--       OR
--       -- Uploader can delete their own files (matched by path + metadata)
--       EXISTS (
--         SELECT 1 FROM files f
--         WHERE f.storage_path = name
--           AND f.uploader_id = auth.uid()
--       )
--     )
--   );


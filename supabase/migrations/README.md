Apply `20261004_student_resumes.sql` to the Supabase database before deploying the student profile endpoints. It has been applied to the current configured database.

Apply `20261004000100_student_documents.sql` before deploying student document uploads. Identity and academic documents (PDF, JPG, PNG; up to 10 MB each) are stored as binary data in the revoked `placement_private.student_documents` table. Student routes enforce ownership; admin routes limit access to authorized staff and the student's tenant. Files are never exposed through public storage URLs or PostgREST.

Resumes (up to 5 MB) are stored as binary data in a private Postgres schema, separate from public profile rows. The server's existing `DATABASE_URL` connection reads/writes them after checking the signed-in student's campus and ownership. No public file URLs or Storage service key are required. Deleting a student cascades to their resume.

Profile email is a contact address; changing it does not change Supabase Auth credentials. Name, roll number, and section cannot be changed through student profile update endpoints.

With the local development server running, `node scripts/test-student-profile.mjs` verifies database persistence, immutable fields, validation, ownership and resume operations using temporary student fixtures removed in `finally`.

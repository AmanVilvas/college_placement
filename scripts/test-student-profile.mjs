import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import pg from 'pg';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL); url.searchParams.delete('sslmode');
const db = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
const origin = 'http://localhost:3000';
const ids = [randomUUID(), randomUUID()];
const roll = 'PROFILE-QA-' + Date.now();
let cookie;
async function request(path, method = 'GET', body, authenticated = true) {
  return fetch(origin + '/api/' + path, { method, headers: { ...(authenticated ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
}
function makeTextPdf(lines) {
  const content = ['BT', '/F1 12 Tf', '50 750 Td', ...lines.flatMap((line, index) => [index ? '0 -28 Td' : '', `(${line}) Tj`]).filter(Boolean), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
(async () => {
  try {
    const { rows: [tenant] } = await db.query('select institution_id, id as campus_id from public.campuses order by created_at limit 1');
    for (let i = 0; i < ids.length; i++) await db.query(`insert into public.student_profiles (id,institution_id,campus_id,roll_number,full_name,email,department,section,year_of_study,graduation_year,phone,cgpa,tenth_percent,twelfth_percent,backlogs,skills,profile_data) values ($1,$2,$3,$4,'Profile Preview','profile-preview@example.com','CSE','A',3,2027,'9876543210',8.6,92,90,0,ARRAY['React','Python'],'{"demo_account":true}')`, [ids[i], tenant.institution_id, tenant.campus_id, roll + (i ? '-OTHER' : '')]);
    const login = await request('auth/student-login', 'POST', { rollNumber: roll, password: roll }, false);
    assert.equal(login.status, 200, 'fixture login');
    cookie = login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
    assert.equal((await request('student/profile', 'GET', undefined, false)).status, 403, 'student session required');
    for (const key of ['full_name', 'roll_number', 'section', 'profile_data', 'id']) {
      assert.equal((await request('student/profile', 'PATCH', { [key]: 'changed' })).status, 400, key + ' is locked');
      assert.equal((await request('student_profiles/' + ids[0], 'PATCH', { [key]: 'changed' })).status, 400, key + ' generic route locked');
    }
    for (const invalid of [{ cgpa: 11 }, { email: 'bad' }, { backlogs: -1 }, { tenth_percent: 101 }, { phone: '123' }]) assert.equal((await request('student/profile', 'PATCH', invalid)).status, 400, 'invalid input rejected');
    assert.equal((await request('student_profiles/' + ids[1], 'PATCH', { phone: '9999999999' })).status, 403, 'another student protected');
    const update = { email: 'updated@example.com', phone: '9999999999', department: 'IT', year_of_study: 4, graduation_year: 2028, cgpa: 9.1, tenth_percent: 93.5, twelfth_percent: 91.2, backlogs: 1, skills: ['SQL', 'React'] };
    assert.equal((await request('student/profile', 'PATCH', update)).status, 200, 'profile saves');
    const refreshed = (await (await request('student/profile')).json()).data;
    assert.equal(refreshed.email, update.email); assert.equal(refreshed.cgpa, 9.1); assert.equal(refreshed.name, 'Profile Preview'); assert.equal(refreshed.section, 'A'); assert.equal(refreshed.rollNumber, roll);
    const { rows: [persisted] } = await db.query('select email, phone, department, cgpa, backlogs from public.student_profiles where id=$1', [ids[0]]);
    assert.equal(persisted.email, update.email); assert.equal(persisted.phone, update.phone); assert.equal(Number(persisted.cgpa), update.cgpa); assert.equal(persisted.backlogs, 1);
    const bad = new FormData(); bad.set('file', new Blob(['not a PDF']), 'fake.pdf');
    assert.equal((await request('student/profile/resume', 'POST', bad)).status, 400, 'file signature checked');
    for (const name of ['resume.pdf', 'updated-resume.pdf']) {
      const bytes = '%PDF-1.4\n% Test resume fixture ' + name + '\n%%EOF';
      const data = new FormData(); data.set('file', new Blob([bytes], { type: 'application/pdf' }), name);
      assert.equal((await request('student/profile/resume', 'POST', data)).status, 200, 'resume saves');
      assert.equal((await (await request('student/profile')).json()).data.resumeFileName, name, 'resume persists on reload');
      assert.equal(await (await request('student/profile/resume')).text(), bytes, 'download matches uploaded bytes');
    }
    const pdf = makeTextPdf(['Professional Summary', 'A computer science student building web software and data driven tools.', 'Skills', 'JavaScript, React, SQL, Python', 'Projects', 'Campus Planner - Built a web application for student events.', 'Education']);
    const resumePdf = new FormData(); resumePdf.set('file', new Blob([pdf], { type: 'application/pdf' }), 'portfolio-test.pdf');
    assert.equal((await request('student/profile/resume', 'POST', resumePdf)).status, 200, 'PDF resume uploads');
    const extractedResponse = await request('student/profile/resume/extract');
    assert.equal(extractedResponse.status, 200, 'uploaded PDF sections extract successfully');
    const { data: extracted } = await extractedResponse.json();
    assert.match(extracted.summary, /computer science student/i);
    assert.deepEqual(extracted.skills, ['JavaScript', 'React', 'SQL', 'Python']);
    assert.ok(extracted.projects.some((project) => project.includes('Campus Planner')));
    assert.equal((await request('student/profile/resume', 'GET', undefined, false)).status, 403, 'download requires student auth');
    assert.equal((await request('student/profile/resume', 'DELETE')).status, 200);
    assert.equal((await request('student/profile/resume')).status, 404);
    assert.equal((await (await request('student/profile')).json()).data.resumeFileName, null);
    const invalidPhoto = new FormData(); invalidPhoto.set('file', new Blob(['not an image'], { type: 'image/png' }), 'fake.png');
    assert.equal((await request('student/profile/photo', 'POST', invalidPhoto)).status, 400, 'invalid image rejected');
    assert.equal((await request('student/profile/photo', 'DELETE', undefined, false)).status, 403, 'photo requires student session');
    let previousPhoto;
    for (const background of ['#ab2424', '#2456ab']) {
      const png = await sharp({ create: { width: 480, height: 320, channels: 3, background } }).png().toBuffer();
      const photo = new FormData(); photo.set('file', new Blob([png], { type: 'image/png' }), 'photo.png');
      const uploaded = await request('student/profile/photo', 'POST', photo);
      assert.equal(uploaded.status, 200, 'photo uploads');
      const { data: { avatarUrl } } = await uploaded.json();
      assert.match(avatarUrl, /^data:image\/webp;base64,/);
      assert.notEqual(avatarUrl, previousPhoto, 'replacement updates the image'); previousPhoto = avatarUrl;
      const metadata = await sharp(Buffer.from(avatarUrl.split(',')[1], 'base64')).metadata();
      assert.equal(metadata.width, 256); assert.equal(metadata.height, 256);
      assert.equal((await (await request('student/profile')).json()).data.avatarUrl, avatarUrl, 'photo persists on reload');
      const relogin = await request('auth/student-login', 'POST', { rollNumber: roll, password: roll }, false);
      assert.equal((await relogin.json()).student.avatarUrl, avatarUrl, 'photo returned on next sign-in');
      const { rows: [record] } = await db.query('select profile_data from public.student_profiles where id=$1', [ids[0]]);
      assert.equal(record.profile_data.avatarUrl, avatarUrl); assert.equal(record.profile_data.demo_account, true, 'other profile metadata preserved');
    }
    const { rows: [other] } = await db.query('select profile_data from public.student_profiles where id=$1', [ids[1]]);
    assert.equal(other.profile_data.avatarUrl, undefined, 'other student unchanged');
    assert.equal((await request('student/profile/photo', 'DELETE')).status, 200);
    assert.equal((await (await request('student/profile')).json()).data.avatarUrl, '', 'photo removal persists');
    console.log('PASS: profile persistence, immutable fields, validation, PDF text extraction, student isolation, resume upload/delete, and photo upload/replace/reload/sign-in/remove.');
  } finally {
    await db.query('delete from public.student_profiles where id = any($1::uuid[])', [ids]);
    await db.end();
    console.log('Temporary fixtures removed.');
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });

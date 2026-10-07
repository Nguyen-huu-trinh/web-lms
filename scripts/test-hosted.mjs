// Explicit integration test: creates isolated fixtures, invokes real Next actions,
// and removes only the exact fixture IDs in finally. Never logs credentials/tokens.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const require = createRequire(import.meta.url);
const { encodeReply } = require('next/dist/compiled/react-server-dom-webpack/client.node');
const manifest = JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')).node;
const base = process.env.LMS_TEST_URL || 'http://localhost:3100';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Test server must be local');
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const run = randomUUID().replaceAll('-','').slice(0,16);
const password = `Lms!${randomUUID()}`;
const newPassword = `Changed!${randomUUID()}`;
const email = `lms-test-${run}@example.com`;
const username = `test_${run}`;
const users = new Set(); const fixtures = [];
const state = {error:'',success:''};
const form = (v) => { const f = new FormData(); for(const [k,x] of Object.entries(v)) f.set(k,String(x)); return f; };
const ok = async (q) => { const r = await q; assert.equal(r.error,null,r.error?.message); return r.data; };
class Session {
  cookies = new Map();
  dataClient() {
    const chunks=[...this.cookies].filter(([name])=>/-auth-token(?:\.\d+)?$/.test(name)).sort(([a],[b])=>a.localeCompare(b));
    const encoded=chunks.map(([,value])=>value).join('');
    assert.ok(encoded.startsWith('base64-'),'Expected SSR auth cookie');
    const session=JSON.parse(Buffer.from(encoded.slice(7),'base64url').toString());
    assert.ok(session.access_token,'Expected access token');
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${session.access_token}`}}});
  }
  async request(path,options={}) {
    const response = await fetch(base+path,{...options,redirect:'manual',headers:{...options.headers,Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ')}});
    for(const cookie of response.headers.getSetCookie()) { const pair=cookie.split(';')[0]; const n=pair.indexOf('='); this.cookies.set(pair.slice(0,n),pair.slice(n+1)); }
    return {status:response.status,location:response.headers.get('location'),redirect:response.headers.get('x-action-redirect'),text:await response.text()};
  }
  async action(name,args,path='/courses') {
    const match = Object.entries(manifest).find(([,v])=>v.exportedName===name);
    assert.ok(match,`Missing action ${name}`);
    const body=await encodeReply(args);
    return this.request(path,{method:'POST',headers:{'Next-Action':match[0],Origin:base,...(typeof body==='string'?{'Content-Type':'text/plain;charset=UTF-8'}:{})},body});
  }
}
const admin = new Session(), student = new Session(), anonymous = new Session();
function success(r,label) { assert.equal(r.status,200,`${label}: HTTP ${r.status}`); assert.match(r.text,/"error":""/,`${label}: action did not succeed`); }
async function record(entity,values,parentId) {
  const context={entity,...(parentId?{parentId}:{})};
  success(await admin.action('saveRecordAction',[context,state,form(values)]),`create ${entity}`);
  const label='name' in values?'name':'title';
  const row=await ok(service.from(entity).select('*').eq(label,values[label]).single());
  fixtures.push([entity,row.id]);
  success(await admin.action('saveRecordAction',[{...context,id:row.id},state,form({...values,[label]:values[label]+' updated'})]),`update ${entity}`);
  assert.equal((await ok(service.from(entity).select(label).eq('id',row.id).single()))[label],values[label]+' updated');
  return row.id;
}
try {
  for(const path of ['/courses','/menu','/change-password','/courses/00000000-0000-4000-8000-000000000001','/lessons/00000000-0000-4000-8000-000000000001']) assert.match((await anonymous.request(path)).location || '',/^\/login/);
  assert.equal((await anonymous.request('/login')).status,200);
  for(const path of ['/register','/forgot-password','/auth/callback','/admin/dashboard']) assert.equal((await anonymous.request(path)).status,404);
  console.log('PASS anonymous route protection and removed routes');
  const created=await ok(service.auth.admin.createUser({email:`admin-${email}`,password,email_confirm:true}));
  users.add(created.user.id);
  await ok(service.from('profiles').update({role:'ADMIN',username,must_change_password:false}).eq('id',created.user.id));
  const login=await admin.action('adminLogin',[form({username,password})],'/login');
  assert.match(login.redirect || '',/^\/courses/);
  const subject=await record('subjects',{name:`subject-${run}`,description:'Integration test'});
  const teacher=await record('teachers',{name:`teacher-${run}`,bio:'Integration test'},subject);
  const course=await record('courses',{title:`course-${run}`,description:'Integration test'},teacher);
  const chapter=await record('chapters',{title:`chapter-${run}`,order_index:0},course);
  const lesson=await record('lessons',{title:`lesson-${run}`,order_index:0},chapter);
  const material=await record('materials',{title:`material-${run}`,type:'pdf',provider:'drive',url:'https://drive.google.com/file/d/test/view',order_index:0},lesson);
  const menu=await record('menus',{name:`menu-${run}`,price:12000});
  console.log('PASS Admin username login and seven entities create/read/update persisted');
  const grant=form({email,kind:'subject',target_id:subject});
  success(await admin.action('addStudentAction',[state,grant]),'provision student');
  const accounts=await ok(service.rpc('find_student_account',{account_email:email}));
  assert.equal(accounts.length,1); const studentId=accounts[0].id; users.add(studentId);
  const profile=await ok(service.from('profiles').select('role,must_change_password').eq('id',studentId).single());
  assert.deepEqual(profile,{role:'STUDENT',must_change_password:true});
  assert.match((await student.action('studentLogin',[form({email,password:'123456'})],'/login')).redirect || '',/^\/change-password/);
  assert.match((await student.request('/courses')).location || '',/^\/change-password/);
  assert.match((await student.request('/menu')).location || '',/^\/change-password/);
  const lockedClient=student.dataClient();
  for(const table of ['subjects','teachers','courses','chapters','lessons','materials','menus']) assert.deepEqual(await ok(lockedClient.from(table).select('id')),[],`Password gate ${table}`);
  const wrong=await student.action('changePassword',[{error:''},form({current_password:'wrong',password:newPassword,confirm_password:newPassword})],'/change-password');
  assert.doesNotMatch(wrong.text,/"error":""/);
  assert.equal((await ok(service.from('profiles').select('must_change_password').eq('id',studentId).single())).must_change_password,true);
  const changed=await student.action('changePassword',[{error:''},form({current_password:'123456',password:newPassword,confirm_password:newPassword})],'/change-password');
  assert.match(changed.redirect || '',/^\/courses\?password=changed/);
  assert.equal((await ok(service.from('profiles').select('must_change_password').eq('id',studentId).single())).must_change_password,false);
  success(await admin.action('addStudentAction',[state,grant]),'duplicate grant');
  assert.equal((await ok(service.from('student_subject_access').select('id').eq('student_id',studentId).eq('subject_id',subject))).length,1);
  console.log('PASS provisioning, mandatory password, wrong/correct change and duplicate grant');
  for(const path of ['/courses',`/courses/teachers/${teacher}`,`/courses/${course}`,`/lessons/${lesson}`,'/menu']) {
    assert.equal((await admin.request(path)).status,200,`admin GET ${path}`);
    const r=await student.request(path); assert.equal(r.status,200,`student GET ${path}`);
    assert.doesNotMatch(r.text,/class="record-controls"/);
  }
  success(await student.action('completeLesson',[{error:'',completed:false},form({lesson_id:lesson})],`/lessons/${lesson}`),'complete lesson');
  assert.equal((await ok(service.from('user_progress').select('is_completed').eq('student_id',studentId).eq('lesson_id',lesson).single())).is_completed,true);
  for(const [name,args] of [
    ['saveRecordAction',[{entity:'subjects'},state,form({name:`forbidden-${run}`})]],
    ['deleteRecordAction',[{entity:'courses',id:course,parentId:teacher},state,form({confirm:'yes'})]],
    ['addStudentAction',[state,form({email,kind:'teacher',target_id:teacher})]],
  ]) { const r=await student.action(name,args); assert.ok(r.status>=400 || /:E\{/.test(r.text),`${name} must be denied`); }
  assert.equal((await ok(service.from('subjects').select('id').eq('name',`forbidden-${run}`))).length,0);
  assert.ok(await ok(service.from('courses').select('id').eq('id',course).single()));
  console.log('PASS role HTTP routes, progress persistence and direct Student Admin-action denial');
  const dataClient=student.dataClient();
  for(const [table,id,values,label] of [
    ['subjects',subject,{name:'forbidden'},'name'],
    ['teachers',teacher,{name:'forbidden',subject_id:subject},'name'],
    ['courses',course,{title:'forbidden',teacher_id:teacher},'title'],
    ['chapters',chapter,{title:'forbidden',course_id:course,order_index:0},'title'],
    ['lessons',lesson,{title:'forbidden',chapter_id:chapter,order_index:0},'title'],
    ['materials',material,{title:'forbidden',lesson_id:lesson,type:'pdf',provider:'drive',url:'https://drive.google.com/file/d/test/view',order_index:0},'title'],
    ['menus',menu,{name:'forbidden',price:0},'name'],
  ]) {
    assert.ok((await dataClient.from(table).insert(values)).error,`Student INSERT ${table} denied`);
    assert.deepEqual(await ok(dataClient.from(table).update({[label]:'forbidden'}).eq('id',id).select('id')),[]);
    assert.deepEqual(await ok(dataClient.from(table).delete().eq('id',id).select('id')),[]);
  }
  assert.ok((await dataClient.from('user_progress').insert({student_id:created.user.id,lesson_id:lesson,is_completed:true})).error);
  assert.deepEqual(await ok(dataClient.from('profiles').update({role:'ADMIN'}).eq('id',studentId).select('id')),[]);
  console.log('PASS hosted RLS: mandatory-password reads, seven-table INSERT/PATCH/DELETE and role/progress spoofing');
  success(await admin.action('addStudentAction',[state,form({email,kind:'teacher',target_id:teacher})]),'teacher grant');
  const access=(await ok(service.from('student_subject_access').select('id').eq('student_id',studentId).eq('subject_id',subject).single())).id;
  success(await admin.action('revokeAccessAction',['subject',subject,access,state,form({confirm:'yes'})]),'revoke subject');
  assert.equal((await student.request(`/courses/${course}`)).status,200);
  const teacherAccess=(await ok(service.from('student_teacher_access').select('id').eq('student_id',studentId).eq('teacher_id',teacher).single())).id;
  success(await admin.action('revokeAccessAction',['teacher',teacher,teacherAccess,state,form({confirm:'yes'})]),'revoke teacher');
  const denied=await student.request(`/courses/${course}`);
  assert.ok(denied.status===404 || denied.text.includes('Bạn chưa được cấp quyền truy cập nội dung này.'));
  assert.ok(!denied.text.includes(`course-${run}`),'Denied page must not leak course title');
  assert.equal((await ok(service.from('user_progress').select('id').eq('student_id',studentId))).length,1);
  const replacement=new Session();
  assert.match((await replacement.action('studentLogin',[form({email,password:newPassword})],'/login')).redirect || '',/^\/courses/);
  assert.match((await student.request('/courses')).location || '',/^\/login\?error=session/);
  const oldPassword=new Session();
  assert.match((await oldPassword.action('studentLogin',[form({email,password:'123456'})],'/login')).redirect || '',/^\/login\?error=credentials/);
  console.log('PASS revoke preserves account/progress/other grant, changed password persists, single-session HTTP');
  const nextAdmin=new Session();
  assert.match((await nextAdmin.action('adminLogin',[form({username,password})],'/login')).redirect || '',/^\/courses/);
  assert.match((await admin.request('/courses')).location || '',/^\/login\?error=session/);
  admin.cookies=nextAdmin.cookies;
  for(const [entity,id,parentId] of [['materials',material,lesson],['lessons',lesson,chapter],['chapters',chapter,course],['courses',course,teacher],['teachers',teacher,subject],['subjects',subject],['menus',menu]]) {
    success(await admin.action('deleteRecordAction',[{entity,id,parentId},state,form({confirm:'yes'})]),`delete ${entity}`);
    assert.equal((await ok(service.from(entity).select('id').eq('id',id))).length,0);
  }
  console.log('PASS seven entities delete through real server actions');
  assert.match((await admin.action('logout',[], '/courses')).redirect || '',/^\/login/);
  assert.match((await admin.request('/courses')).location || '',/^\/login/);
  console.log('PASS Admin single-session and logout');
} finally {
  // Exact-email recovery also covers failure after account creation but before lookup.
  const recovered=await service.rpc('find_student_account',{account_email:email});
  for(const row of recovered.data || []) users.add(row.id);
  const failures=[];
  for(const [table,id] of fixtures.reverse()) { const r=await service.from(table).delete().eq('id',id); if(r.error) failures.push(`${table}:${id}`); }
  for(const id of users) { const r=await service.auth.admin.deleteUser(id); if(r.error) failures.push(`auth:${id}`); }
  assert.deepEqual(failures,[],'Fixture cleanup failed; inspect listed exact IDs');
  console.log('CLEANUP isolated fixture records and Auth users removed');
}

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

// Runs real PostgreSQL RLS, FK, trigger and constraint logic in an isolated WASM DB.
// Auth helpers emulate Supabase's JWT claims; does not emulate hosted Auth or Realtime.
test("LMS migration and security boundaries", async (t) => {
  const db = new PGlite();
  const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const admin = uid(1), student = uid(2), other = uid(3), sid = uid(10), newSid = uid(11);
  const subject = uid(20), teacherA = uid(30), teacherB = uid(31), courseA = uid(40), courseB = uid(41);
  const chapterA = uid(50), chapterB = uid(51), lessonA = uid(60), lessonB = uid(61);
  const query = (sql, args) => db.query(sql, args);
  const scalar = async (sql) => Object.values((await query(sql)).rows[0])[0];
  async function login(user, session = sid) {
    await db.exec("reset role");
    await query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: user, session_id: session })]);
    await db.exec("set role authenticated");
  }
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb, encrypted_password text default 'test-hash');
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
      grant usage on schema auth, public to authenticated, anon, service_role;
      grant execute on all functions in schema auth to authenticated, anon, service_role;
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/202610060001_lms_foundation.sql", import.meta.url), "utf8"));
    await query("insert into auth.users(id,email,raw_user_meta_data) values ($1,'admin@example.test','{}'),($2,'student@example.test', '{\"role\":\"ADMIN\"}'),($3,'other@example.test','{}')", [admin, student, other]);
    await query("update public.profiles set role='ADMIN', username='admin' where id=$1", [admin]);
    await query("insert into active_sessions(user_id,session_id) values ($1,$4),($2,$4),($3,$4)", [admin, student, other, sid]);
    await query("insert into subjects(id,name) values ($1,'Toán')", [subject]);
    await query("insert into teachers(id,subject_id,name) values ($1,$3,'A'),($2,$3,'B')", [teacherA, teacherB, subject]);
    await query("insert into courses(id,teacher_id,title) values ($1,$3,'A'),($2,$4,'B')", [courseA, courseB, teacherA, teacherB]);
    await query("insert into chapters(id,course_id,title,order_index) values ($1,$3,'A',0),($2,$4,'B',0)", [chapterA, chapterB, courseA, courseB]);
    await query("insert into lessons(id,chapter_id,title,order_index) values ($1,$3,'A',0),($2,$4,'B',0)", [lessonA, lessonB, chapterA, chapterB]);
    await query("insert into materials(lesson_id,title,type,provider,url,order_index) values ($1,'PDF','pdf','drive','https://drive.google.com/file/d/example/view',0),($2,'Video','video','youtube','https://youtu.be/example',0)", [lessonA, lessonB]);
    await query("insert into student_teacher_access(student_id,teacher_id) values ($1,$2)", [student, teacherA]);
    await db.exec("insert into menus(name,price) values ('Menu A',100)");
    await db.exec(await readFile(new URL("../supabase/migrations/202610060002_password_auth.sql", import.meta.url), "utf8"));

    await t.test("migration preserves Admin and requires first password change for students", async () => {
      assert.equal(await scalar(`select must_change_password from profiles where id='${admin}'`), false);
      assert.equal(await scalar(`select must_change_password from profiles where id='${student}'`), true);
      await login(student);
      assert.equal(await scalar("select session_is_active()"), true);
      assert.equal(await scalar("select count(*)::int from profiles"), 1);
      for (const table of ["subjects", "teachers", "courses", "chapters", "lessons", "materials", "menus", "user_progress"]) assert.equal(await scalar(`select count(*)::int from ${table}`), 0, table);
      assert.equal((await query("update profiles set must_change_password=false,provisioned_by_admin=true returning id")).rows.length, 0);
      await assert.rejects(query("insert into user_progress(student_id,lesson_id) values ($1,$2)", [student, lessonA]));
      await db.exec("reset role");
      await query("update auth.users set raw_user_meta_data='{\"must_change_password\":false}' where id=$1", [student]);
      assert.equal(await scalar(`select must_change_password from profiles where id='${student}'`), true);
      await query("update auth.users set encrypted_password='changed-hash' where id=$1", [student]);
      assert.equal(await scalar(`select must_change_password from profiles where id='${student}'`), false);
    });

    await t.test("provisioning is service-only, checks active Admin, is atomic and idempotent", async () => {
      const fresh = uid(4);
      await db.exec("reset role");
      await query("insert into auth.users(id,email) values ($1,'fresh@example.test')", [fresh]);
      assert.equal(await scalar(`select provisioned_by_admin from profiles where id='${fresh}'`), false);
      await login(student);
      await assert.rejects(query("select * from find_student_account('fresh@example.test')"));
      await assert.rejects(query("select grant_student_access($1,$2,$3,'subject',$4)", [admin, sid, fresh, subject]));
      await db.exec("reset role; set role service_role");
      assert.equal((await query("select * from find_student_account(' FRESH@example.test ')")).rows.length, 1);
      await assert.rejects(query("select grant_student_access($1,$2,$3,'subject',$4)", [admin, newSid, fresh, subject]));
      await assert.rejects(query("select grant_student_access($1,$2,$3,'subject',$4)", [student, sid, fresh, subject]));
      await assert.rejects(query("select grant_student_access($1,$2,$3,'subject',$4)", [admin, sid, admin, subject]));
      await assert.rejects(query("select grant_student_access($1,$2,$3,'subject',$4)", [admin, sid, fresh, uid(999)]));
      assert.equal(await scalar(`select provisioned_by_admin from profiles where id='${fresh}'`), false);
      await query("select grant_student_access($1,$2,$3,'subject',$4)", [admin, sid, fresh, subject]);
      await query("select grant_student_access($1,$2,$3,'subject',$4)", [admin, sid, fresh, subject]);
      assert.equal(await scalar(`select count(*)::int from student_subject_access where student_id='${fresh}'`), 1);
      assert.equal(await scalar(`select must_change_password from profiles where id='${fresh}'`), true);
      await db.exec("reset role");
      await query("update auth.users set encrypted_password='new-fresh-hash' where id=$1", [fresh]);
      await db.exec("set role service_role");
      await query("select grant_student_access($1,$2,$3,'teacher',$4)", [admin, sid, fresh, teacherB]);
      assert.equal(await scalar(`select must_change_password from profiles where id='${fresh}'`), false);
      await db.exec("reset role");
      assert.equal(await scalar(`select encrypted_password from auth.users where id='${fresh}'`), "new-fresh-hash");
      await query("delete from auth.users where id=$1", [fresh]);
    });

    await t.test("self-created account cannot get LMS content even with a planted active row", async () => {
      await db.exec("reset role");
      await query("update auth.users set encrypted_password='other-changed' where id=$1", [other]);
      await login(other);
      assert.equal(await scalar("select count(*)::int from subjects"), 0);
      assert.equal(await scalar("select count(*)::int from courses"), 0);
      await db.exec("reset role");
    });

    await t.test("profile trigger ignores role metadata and synchronizes email", async () => {
      assert.equal(await scalar(`select role from profiles where id='${student}'`), "STUDENT");
      await query("update auth.users set email='new@example.test' where id=$1", [student]);
      assert.equal(await scalar(`select email from profiles where id='${student}'`), "new@example.test");
      await assert.rejects(query("update profiles set role='TEACHER' where id=$1", [student]));
    });
    await t.test("teacher grant reveals subject but never sibling content", async () => {
      await login(student);
      assert.equal(await scalar("select count(*)::int from subjects"), 1);
      assert.equal(await scalar("select count(*)::int from teachers"), 2);
      for (const table of ["courses", "chapters", "lessons", "materials"]) assert.equal(await scalar(`select count(*)::int from ${table}`), 1, table);
      assert.equal(await scalar("select count(*)::int from menus"), 1);
      assert.equal(await scalar(`select count(*)::int from subjects s where exists (select 1 from student_subject_access a where a.subject_id=s.id) or exists (select 1 from student_teacher_access a join teachers t on t.id=a.teacher_id where t.subject_id=s.id)`), 1);
    });
    await t.test("student cannot escalate role, alter catalog, or grant access", async () => {
      await login(student);
      assert.equal((await query("update profiles set role='ADMIN',username='hacker' where id=$1 returning id", [student])).rows.length, 0);
      for (const table of ["subjects", "teachers", "courses", "chapters", "lessons", "materials", "menus"]) {
        assert.equal((await query(`delete from ${table} returning id`)).rows.length, 0);
      }
      await assert.rejects(query("insert into student_subject_access(student_id,subject_id) values ($1,$2)", [student, subject]));
      await assert.rejects(query("update active_sessions set session_id=$1 where user_id=$2", [newSid, student]));
      assert.equal(await scalar("select count(*)::int from profiles"), 1);
    });
    await t.test("completion is explicit, isolated, and requires lesson access", async () => {
      await login(student);
      assert.equal(await scalar("select count(*)::int from user_progress"), 0);
      await query("insert into user_progress(student_id,lesson_id,is_completed) values ($1,$2,true)", [student, lessonA]);
      assert.equal(await scalar("select count(*)::int from user_progress where is_completed"), 1);
      await assert.rejects(query("insert into user_progress(student_id,lesson_id,is_completed) values ($1,$2,true)", [other, lessonA]));
      await assert.rejects(query("insert into user_progress(student_id,lesson_id,is_completed) values ($1,$2,true)", [student, lessonB]));
      await assert.rejects(query("update user_progress set student_id=$1", [other]));
      await query("update user_progress set is_completed=false");
      assert.equal(await scalar("select count(*)::int from user_progress where is_completed"), 0);
      await login(other);
      assert.equal(await scalar("select count(*)::int from user_progress"), 0);
      assert.equal((await query("delete from user_progress where student_id=$1 returning id",[student])).rows.length,0);
      assert.equal((await query("update user_progress set is_completed=true where student_id=$1 returning id",[student])).rows.length,0);
      assert.equal(await scalar("select count(*)::int from courses"), 0);
    });
    await t.test("subject grant includes both teachers; revocation removes access", async () => {
      await login(admin);
      await query("insert into student_subject_access(student_id,subject_id) values ($1,$2)", [student, subject]);
      await login(student);
      assert.equal(await scalar("select count(*)::int from courses"), 2);
      await login(admin);
      await query("delete from student_subject_access where student_id=$1", [student]);
      await login(student);
      assert.equal(await scalar("select count(*)::int from courses"), 1);
      // Revoking the last direct grant preserves persisted progress and account.
      await login(admin);
      await query("delete from student_teacher_access where student_id=$1",[student]);
      assert.equal(await scalar(`select count(*)::int from user_progress where student_id='${student}'`),1);
      assert.equal(await scalar(`select count(*)::int from profiles where id='${student}'`),1);
      await login(student);
      assert.equal(await scalar("select count(*)::int from courses"),0);
      await login(admin);
      await query("insert into student_teacher_access(student_id,teacher_id) values ($1,$2)",[student,teacherA]);
    });
    await t.test("combined grants span subjects without opening an ungranted sibling", async () => {
      await login(admin);
      const second=uid(21),ta=uid(32),tb=uid(33);
      await query("insert into subjects(id,name) values ($1,'Physics')",[second]);
      await query("insert into teachers(id,subject_id,name) values ($1,$3,'PA'),($2,$3,'PB')",[ta,tb,second]);
      await query("insert into courses(teacher_id,title) values ($1,'Physics A'),($2,'Physics B')",[ta,tb]);
      await query("insert into student_subject_access(student_id,subject_id) values ($1,$2)",[student,subject]);
      await query("insert into student_teacher_access(student_id,teacher_id) values ($1,$2)",[student,ta]);
      await login(student);
      assert.equal(await scalar("select count(*)::int from courses"),3);
      assert.equal(await scalar("select count(*)::int from courses where title='Physics B'"),0);
      await login(admin);
      await query("delete from subjects where id=$1",[second]);
      await query("delete from student_subject_access where student_id=$1",[student]);
    });
    await t.test("replacement blocks old JWT at RLS; old logout cannot revoke new session", async () => {
      await db.exec("reset role");
      await query("update active_sessions set session_id=$1 where user_id=$2", [newSid, student]);
      await login(student);
      assert.equal(await scalar("select session_is_active()"), false);
      for (const table of ["profiles", "subjects", "teachers", "courses", "chapters", "lessons", "materials", "user_progress", "menus"]) assert.equal(await scalar(`select count(*)::int from ${table}`), 0, table);
      assert.equal(await scalar("select count(*)::int from active_sessions"), 1);
      await assert.rejects(query("insert into user_progress(student_id,lesson_id) values ($1,$2)", [student, lessonA]));
      await query("select end_session()");
      await login(student, newSid);
      assert.equal(await scalar("select session_is_active()"), true);
      await query("select end_session()");
      assert.equal(await scalar("select session_is_active()"), false);
    });
    await t.test("constraints reject invalid providers, links and duplicate grants", async () => {
      await login(admin);
      for (const [type, provider, url] of [["pdf", "youtube", "https://youtube.com/test"], ["text", "drive", "https://drive.google.com/a"], ["pdf", "drive", "javascript:alert(1)"], ["video", "youtube", "https://youtube.com.evil.test/a"]]) {
        await assert.rejects(query("insert into materials(lesson_id,title,type,provider,url,order_index) values ($1,'bad',$2,$3,$4,0)", [lessonA, type, provider, url]));
      }
      await assert.rejects(query("insert into student_teacher_access(student_id,teacher_id) values ($1,$2)", [student, teacherA]));
      await assert.rejects(query("insert into menus(name,price) values ('bad',-1)"));
    });
    await t.test("admin CRUD and hard delete cascades", async () => {
      await db.exec("reset role");
      await query("insert into active_sessions(user_id,session_id) values ($1,$2)",[student,newSid]);
      await login(admin);
      const specs = [
        ['subjects',{name:'Temporary'}],
        ['teachers',{name:'Temporary',subject_id:subject}],
        ['courses',{title:'Temporary',teacher_id:teacherA}],
        ['chapters',{title:'Temporary',course_id:courseA,order_index:0}],
        ['lessons',{title:'Temporary',chapter_id:chapterA,order_index:0}],
        ['materials',{title:'Temporary',lesson_id:lessonA,type:'pdf',provider:'drive',url:'https://drive.google.com/file/d/test/view',order_index:0}],
        ['menus',{name:'Temporary',price:0}],
      ];
      for (const [table,values] of specs) {
        const columns = Object.keys(values), args = Object.values(values);
        const insert = `insert into ${table} (${columns.join(',')}) values (${args.map((_,i) => '$'+(i+1)).join(',')}) returning id`;
        const {id} = (await query(insert,args)).rows[0];
        const label = 'name' in values ? 'name' : 'title';
        assert.equal((await query(`select ${label} from ${table} where id=$1`,[id])).rows[0][label],'Temporary');
        assert.equal((await query(`update ${table} set ${label}='Updated' where id=$1 returning ${label}`,[id])).rows[0][label],'Updated');
        // Reject direct REST-equivalent writes even when the row is readable.
        await login(student,newSid);
        await assert.rejects(query(insert,args));
        assert.equal((await query(`update ${table} set ${label}='Hacked' where id=$1 returning id`,[id])).rows.length,0);
        assert.equal((await query(`delete from ${table} where id=$1 returning id`,[id])).rows.length,0);
        await login(admin);
        assert.equal((await query(`delete from ${table} where id=$1 returning id`,[id])).rows.length,1);
      }
      await query("update subjects set name='Math' where id=$1", [subject]);
      assert.equal(await scalar("select name from subjects"), "Math");
      await query("insert into student_subject_access(student_id,subject_id) values ($1,$2)",[student,subject]);
      await query("delete from subjects where id=$1", [subject]);
      for (const table of ["teachers", "courses", "chapters", "lessons", "materials", "student_subject_access", "student_teacher_access", "user_progress"]) assert.equal(await scalar(`select count(*)::int from ${table}`), 0, table);
      await db.exec("reset role; set role anon");
      for (const table of ['profiles','subjects','teachers','courses','chapters','lessons','materials','student_subject_access','student_teacher_access','user_progress','menus','active_sessions']) await assert.rejects(query(`select * from ${table}`));
      await assert.rejects(query("select session_is_active()"));
    });
  } finally { await db.close(); }
});

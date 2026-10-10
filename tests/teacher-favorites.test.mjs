import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "./catalog-search" && context.parentURL === new URL("../lib/teacher-favorites.ts", import.meta.url).href) {
      return { url: new URL("../lib/catalog-search.ts", import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const { filterFavoriteTeachers } = await import("../lib/teacher-favorites.ts");

test("favorites sort first stably and combine with accent-insensitive search", () => {
  const teachers = [{ id: "a", name: "An" }, { id: "b", name: "Đỗ Văn Đức" }, { id: "c", name: "Bình" }, { id: "d", name: "Đức Anh" }];
  const favorites = new Set(["b", "d"]);
  const ids = result => result.map(teacher => teacher.id);
  assert.deepEqual(ids(filterFavoriteTeachers(teachers, favorites, "", false)), ["b", "d", "a", "c"]);
  assert.deepEqual(ids(filterFavoriteTeachers(teachers, favorites, "DUC", true)), ["b", "d"]);
  assert.deepEqual(ids(filterFavoriteTeachers(teachers, favorites, "binh", true)), []);
  assert.deepEqual(ids(filterFavoriteTeachers(teachers, new Set(), "", false)), ["a", "b", "c", "d"]);
  assert.deepEqual(ids(teachers), ["a", "b", "c", "d"]);
});

test("teacher favorites persist per student, enforce RLS and do not grant access", async () => {
  const db = new PGlite();
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const student = id(1), other = id(2), admin = id(3), session = id(4), teacher = id(5), subject = id(6);
  async function login(user, sessionId = session) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: user, session_id: sessionId })]);
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
    for (const file of ["202610060001_lms_foundation.sql", "202610060002_password_auth.sql", "202610100005_teacher_favorites.sql"]) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
    }
    for (const user of [student, other, admin]) {
      await db.query("insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,'{}')", [user, `${user}@example.test`]);
      await db.query("insert into active_sessions(user_id,session_id) values ($1,$2)", [user, session]);
    }
    await db.exec("update profiles set provisioned_by_admin=true, must_change_password=false");
    await db.query("update profiles set role='ADMIN', username='admin' where id=$1", [admin]);
    await db.query("insert into subjects(id,name) values ($1,'Math')", [subject]);
    await db.query("insert into teachers(id,subject_id,name) values ($1,$2,'Teacher')", [teacher, subject]);
    const insert = (owner = student, target = teacher) => db.query("insert into student_teacher_favorites(student_id,teacher_id) values ($1,$2) on conflict do nothing", [owner, target]);
    const rows = async () => (await db.query("select * from student_teacher_favorites")).rows;

    await login(student);
    await insert();
    await insert(); // Repeated desired-state requests are idempotent.
    assert.equal((await rows()).length, 1);
    assert.equal((await db.query("select private.can_teacher($1) as allowed", [teacher])).rows[0].allowed, false);
    await assert.rejects(insert(other), { code: "42501" });
    await assert.rejects(insert(student, id(99)), { code: "23503" });

    await login(other);
    assert.equal((await rows()).length, 0);
    assert.equal((await db.query("delete from student_teacher_favorites returning *")).rows.length, 0);
    await insert(other);
    await login(student);
    assert.equal((await rows()).length, 1); // Still saved after changing sessions.
    await db.query("delete from student_teacher_favorites where teacher_id=$1", [teacher]);
    assert.equal((await rows()).length, 0);
    await insert();

    await login(student, id(98));
    assert.equal((await rows()).length, 0);
    await assert.rejects(insert(student, teacher), { code: "42501" });
    await login(admin);
    assert.equal((await rows()).length, 0);
    await assert.rejects(insert(admin), { code: "42501" });
    await db.exec("reset role; set role anon");
    await assert.rejects(rows(), { code: "42501" });
    await db.exec("reset role");
    await db.query("delete from teachers where id=$1", [teacher]);
    assert.equal((await rows()).length, 0); // No orphan favorites for deleted teachers.
  } finally { await db.close(); }
});

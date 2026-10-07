import { test } from "node:test";
import assert from "node:assert/strict";
import { provisionStudent } from "../services/student-provisioning-core.ts";
import { normalizeEmail, validatePasswordChange } from "../lib/auth-validation.ts";

function account(overrides = {}) {
  return { id: "student-id", profile_id: "student-id", role: "STUDENT", has_password: true, auth_exists: true, ...overrides };
}
test("new account uses exactly the default password and grants access", async () => {
  const calls = [];
  const result = await provisionStudent("student1@example.com", {
    findAccount: async () => [],
    createAccount: async (email, password) => { calls.push([email, password]); return "new-id"; },
    grantAccess: async (id) => { calls.push(id); },
  });
  assert.deepEqual(calls, [["student1@example.com", "123456"], "new-id"]);
  assert.equal(result.created, true);
});
test("existing account only receives access; no password creation or reset", async () => {
  let grants = 0;
  const result = await provisionStudent("student1@example.com", {
    findAccount: async () => [account()],
    createAccount: async () => { assert.fail("must never create/reset existing account"); },
    grantAccess: async () => { grants++; },
  });
  assert.equal(result.created, false);
  assert.equal(grants, 1);
});
test("concurrent duplicate creation is recovered by exact lookup", async () => {
  let lookups = 0;
  const result = await provisionStudent("student1@example.com", {
    findAccount: async () => ++lookups === 1 ? [] : [account()],
    createAccount: async () => { throw new Error("already registered"); },
    grantAccess: async (id) => assert.equal(id, "student-id"),
  });
  assert.equal(result.created, false);
});
test("admin, orphan, passwordless and duplicate legacy accounts are not altered", async () => {
  for (const matches of [[account({ role: "ADMIN" })], [account({ auth_exists: false })], [account({ has_password: false })], [account(), account({ id: "duplicate" })]]) {
    await assert.rejects(provisionStudent("student1@example.com", {
      findAccount: async () => matches,
      createAccount: async () => assert.fail("unexpected creation"),
      grantAccess: async () => assert.fail("unexpected mutation"),
    }));
  }
});
test("failed grant can be retried without recreating/resetting the new account", async () => {
  let existing = [], creations = 0, grants = 0;
  const ports = {
    findAccount: async () => existing,
    createAccount: async () => { creations++; existing = [account()]; return "student-id"; },
    grantAccess: async () => { if (++grants === 1) throw new Error("target deleted"); },
  };
  await assert.rejects(provisionStudent("student1@example.com", ports));
  await provisionStudent("student1@example.com", ports);
  assert.equal(creations, 1);
  assert.equal(grants, 2);
});
test("email normalization and password validation reject malformed input", () => {
  assert.equal(normalizeEmail("  Student1@Example.com "), "student1@example.com");
  for (const input of ["", null, "bad", "a b@c.com", "a@b@c.com"]) assert.throws(() => normalizeEmail(input));
  for (const args of [["", "Strong123!", "Strong123!"], ["123456", "short", "short"], ["123456", "New12345", "Different123"], ["Current123", "123456", "123456"], ["Current123", "Current123", "Current123"]]) assert.throws(() => validatePasswordChange(...args));
  assert.doesNotThrow(() => validatePasswordChange("123456", "NewStrong123!", "NewStrong123!"));
});

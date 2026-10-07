import { test } from "node:test";
import assert from "node:assert/strict";
import { materialLink, videoEmbed, progressSummary, isUuid } from "../lib/learning.ts";
import { allRows } from "../repositories/pagination.ts";

test("YouTube supports watch, short links, shorts and embed without trusting arbitrary hosts", () => {
  const expected = "https://www.youtube-nocookie.com/embed/abcdefghijk";
  for (const url of ["https://www.youtube.com/watch?v=abcdefghijk&list=x", "https://youtu.be/abcdefghijk?t=30", "https://youtube.com/shorts/abcdefghijk", "https://youtube.com/embed/abcdefghijk", "https://youtube.com/live/abcdefghijk"]) assert.equal(videoEmbed("youtube",url),expected);
  for (const url of ["https://youtube.com.evil.test/watch?v=abcdefghijk", "javascript:alert(1)", "http://youtube.com/watch?v=abcdefghijk", "https://user@youtube.com/watch?v=abcdefghijk", "https://youtube.com:8080/watch?v=abcdefghijk", "https://youtube.com/watch?v=bad", "not-a-url"]) assert.equal(videoEmbed("youtube",url),null);
});
test("Drive preview supports file and query links with safe external fallback", () => {
  const expected = "https://drive.google.com/file/d/file_123-xyz/preview";
  for (const url of ["https://drive.google.com/file/d/file_123-xyz/view?usp=sharing", "https://drive.google.com/open?id=file_123-xyz", "https://drive.google.com/uc?id=file_123-xyz"]) assert.equal(videoEmbed("drive",url),expected);
  assert.equal(videoEmbed("drive","https://drive.google.com/drive/folders/folder"),null);
  assert.equal(materialLink("drive","https://drive.google.com/drive/folders/folder"),"https://drive.google.com/drive/folders/folder");
  assert.equal(materialLink("drive","https://drive.google.com.evil.test/a"),null);
  assert.equal(materialLink("youtube","https://drive.google.com/file/d/a/view"),null);
  assert.equal(materialLink("other","https://example.com"),null);
});
test("progress only counts unique lessons of this course and handles empty courses", () => {
  assert.deepEqual(progressSummary([], ["outside"]), {count:0,total:0,percent:0});
  assert.deepEqual(progressSummary(["a","b","c"], ["a","a","outside"]), {count:1,total:3,percent:33});
  const ids = Array.from({length:20},(_,i) => String(i));
  assert.deepEqual(progressSummary(ids,ids.slice(0,8)), {count:8,total:20,percent:40});
  assert.deepEqual(progressSummary(ids,ids.slice(0,9)), {count:9,total:20,percent:45});
});
test("pagination reads beyond the default row cap and propagates errors", async () => {
  const source = Array.from({length:1203},(_,i) => i);
  const calls = [];
  assert.deepEqual(await allRows(async (a,b) => { calls.push([a,b]); return { data:source.slice(a,b+1),error:null }; }), source);
  assert.equal(calls.length,3);
  await assert.rejects(allRows(async () => ({data:null,error:{message:"internal SQL details"}})), {message:"Không thể tải dữ liệu."});
});
test("malformed deep-link IDs are rejected before querying", () => {
  assert.ok(isUuid("00000000-0000-4000-8000-000000000001"));
  for (const value of ["", "-".repeat(36), "not-a-uuid", "../login"]) assert.equal(isUuid(value),false);
});

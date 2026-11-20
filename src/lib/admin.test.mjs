import assert from "node:assert/strict";
import test from "node:test";
import { csvFor, formatStorage, normalizeUsers } from "./admin.ts";

const person = { _id: "1", email: "person@example.com", firstName: "Ada", lastName: "Okafor", usage: { shareCount: 2, storageBytes: 1048576 } };

test("normalizes each supported users response shape", () => {
  assert.equal(normalizeUsers({ users: [person] }).length, 1);
  assert.equal(normalizeUsers({ data: [person] }).length, 1);
  assert.equal(normalizeUsers({ data: { users: [{ ...person, _id: undefined, id: "1" }] } })[0]._id, "1");
  assert.throws(() => normalizeUsers({ data: {} }), /unexpected users format/);
});

test("formats storage at the MB and GB thresholds", () => {
  assert.equal(formatStorage(1048576), "1.00 MB");
  assert.equal(formatStorage(10 * 1048576), "10.0 MB");
  assert.equal(formatStorage(1024 * 1048576), "1.00 GB");
});

test("exports quoted cells, neutralizes formulas, and uses all supplied rows", () => {
  const csv = csvFor([{ ...person, firstName: '=HYPERLINK("x")' }, person], [person]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"x\"\") Okafor\""));
  assert.equal(csv.split("\r\n").length, 3);
  assert.ok(csv.includes('"1.00"'));
});

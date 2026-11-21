import assert from "node:assert/strict";
import test from "node:test";
import { csvFor, effectiveStatus, effectiveStatusLabel, formatStorage, normalizeUsers, renewalDue } from "./admin.ts";

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

const NOW = Date.parse("2026-11-21T12:00:00Z");
const sub = (subscription) => ({ _id: "u", email: "u@example.com", subscription });

test("a TRIAL whose end date has passed is a trial that ended", () => {
  assert.equal(effectiveStatus(sub({ status: "TRIAL", trialEndDate: "2026-11-20T00:00:00Z" }), NOW), "TRIAL_ENDED");
  assert.equal(effectiveStatus(sub({ status: "TRIAL", trialEndDate: "2026-11-21T12:00:00Z" }), NOW), "TRIAL_ENDED");
  assert.equal(effectiveStatus(sub({ status: "TRIAL", trialEndDate: "2026-11-30T00:00:00Z" }), NOW), "TRIAL");
  assert.equal(effectiveStatus(sub({ status: "TRIAL", trialEndDate: null }), NOW), "TRIAL");
  assert.equal(effectiveStatus(sub({ status: "TRIAL", trialEndDate: "not a date" }), NOW), "TRIAL");
});

test("backend statuses are authoritative, case-insensitive, and missing status is not shown as Trial", () => {
  for (const status of ["ACTIVE", "PAST_DUE", "EXPIRED", "CANCELLED"]) assert.equal(effectiveStatus(sub({ status, trialEndDate: "2026-01-01T00:00:00Z" }), NOW), status);
  assert.equal(effectiveStatus(sub({ status: "active" }), NOW), "ACTIVE");
  assert.equal(effectiveStatus(sub(null), NOW), "NONE");
  assert.equal(effectiveStatus(sub({}), NOW), "NONE");
  assert.equal(effectiveStatus(sub({ status: "PAUSED" }), NOW), "OTHER");
  assert.equal(effectiveStatusLabel(sub({ status: "PAUSED" }), NOW), "PAUSED");
});

test("ACTIVE past its period end stays active with renewal due", () => {
  const user = sub({ status: "ACTIVE", subscriptionExpiresAt: "2026-11-21T00:00:00Z" });
  assert.equal(effectiveStatus(user, NOW), "ACTIVE");
  assert.equal(renewalDue(user, NOW), true);
  assert.equal(effectiveStatusLabel(user, NOW), "Active (renewal due)");
  assert.equal(renewalDue(sub({ status: "ACTIVE", subscriptionExpiresAt: "2026-12-21T00:00:00Z" }), NOW), false);
  assert.equal(renewalDue(sub({ status: "EXPIRED", subscriptionExpiresAt: "2026-11-01T00:00:00Z" }), NOW), false);
});

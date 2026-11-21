import assert from "node:assert/strict";
import test from "node:test";
import { billingAccount, csvFor, displayName, effectiveStatus, effectiveStatusLabel, formatStorage, normalizeUsers, planLabel, renewalDue } from "./admin.ts";

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

// Shape copied from a real GET /admin/users response (personal details replaced).
const realPage = { data: { total: 4, page: 1, limit: 100, statusCounts: { ALL: 4, TRIAL: 2, ACTIVE: 1, EXPIRED: 1 }, items: [
  { id: "a1", name: "Ended Trial", firstName: "Ended", lastName: "Trial", companyName: null, email: "a@example.com", accountType: "individual", role: "OWNER", companyId: null, plan: null, status: "TRIAL", trialEndDate: "2026-10-01T20:18:20.019Z", subscriptionExpiresAt: null, isVerified: true, storageBytes: 118391, shareCount: 5, createdAt: "2026-09-24T20:18:20.032Z" },
  { id: "a2", name: "Paying User", firstName: "Paying", lastName: "User", companyName: null, email: "b@example.com", accountType: "individual", role: "OWNER", companyId: null, plan: "STARTER", status: "ACTIVE", trialEndDate: "2026-07-17T16:14:00.296Z", subscriptionExpiresAt: "2026-12-14T17:04:06.642Z", isVerified: true, storageBytes: 21321185, shareCount: 3, createdAt: "2026-07-10T16:14:00.305Z" },
  { id: "c1", name: "Matt Labs", firstName: "Matt Labs", lastName: null, companyName: "Matt Labs", email: "c@example.com", accountType: "company", role: "OWNER", companyId: null, plan: "TEAM", status: "EXPIRED", trialEndDate: "2026-09-07T17:52:21.107Z", subscriptionExpiresAt: "2026-09-30T18:10:08.756Z", isVerified: true, storageBytes: 1036351, shareCount: 3, createdAt: "2026-08-31T17:52:21.111Z" },
  { id: "m1", name: "Team Member", firstName: "Team", lastName: "Member", companyName: null, email: "d@example.com", accountType: "individual", role: "TEAM_MEMBER", companyId: "c1", plan: null, status: "TRIAL", trialEndDate: "2026-09-07T18:03:52.439Z", subscriptionExpiresAt: null, isVerified: true, storageBytes: 0, shareCount: 0, createdAt: "2026-08-31T18:03:52.440Z" },
] } };

test("reads the flat billing and usage fields from GET /admin/users", () => {
  const [ended, paying] = normalizeUsers(realPage);
  assert.equal(ended._id, "a1");
  assert.equal(ended.subscription.status, "TRIAL");
  assert.equal(ended.subscription.trialEndDate, "2026-10-01T20:18:20.019Z");
  assert.equal(ended.usage.shareCount, 5);
  assert.equal(ended.usage.storageBytes, 118391);
  assert.equal(paying.subscription.subscriptionPlan, "STARTER");
  assert.equal(paying.subscription.subscriptionExpiresAt, "2026-12-14T17:04:06.642Z");
  assert.equal(planLabel(paying.subscription.subscriptionPlan), "Starter");
  assert.equal(planLabel(null), "No paid plan");
});

test("real records resolve to accurate statuses, with team members on their company subscription", () => {
  const users = normalizeUsers(realPage);
  const status = (id) => effectiveStatus(billingAccount(users.find(user => user._id === id), users), NOW);
  assert.equal(status("a1"), "TRIAL_ENDED");
  assert.equal(status("a2"), "ACTIVE");
  assert.equal(status("c1"), "EXPIRED");
  assert.equal(status("m1"), "EXPIRED");
  assert.equal(displayName(users[2]), "Matt Labs");
  const csv = csvFor(users, users);
  assert.ok(csv.includes('"Expired (company)","TRIAL"'));
  assert.ok(csv.includes('"Starter","Active","ACTIVE"'));
  assert.ok(csv.includes('"No paid plan","Trial ended","TRIAL"'));
});

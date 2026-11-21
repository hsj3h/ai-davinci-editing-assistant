import test from "node:test";

import assert from "node:assert/strict";
import {
  createExecutionSession,
  evaluateAction,
  getActionRisk,
} from "../src/agents/execution/executionManager.js";
import type { EditingAction } from "../src/agents/planner/editingPlanner.js";

const action: EditingAction = {
  id: "action_1",
  type: "remove_silence",
  description: "Remove unnecessary pauses",
  reason: "Improve timeline pacing",
  target: "Video 1",
  clip_targets: [],
  parameters: {},
  requiresApproval: true,
};

// 1. Manual Mode: unapproved action must be blocked.
const manualSession = createExecutionSession("manual");

const blocked = evaluateAction(action, manualSession);

assert.equal(blocked.allowed, false);
assert.equal(blocked.requiresConfirmation, true);

console.log("PASS: Manual Mode blocks unapproved actions.");

// 2. Manual Mode: approved action must be allowed.
const approved = evaluateAction(action, manualSession, {
  actionId: "action_1",
  approved: true,
});

assert.equal(approved.allowed, true);
assert.equal(approved.requiresConfirmation, false);

console.log("PASS: Manual Mode allows approved actions.");

// 3. Fast Mode: destructive actions must be allowed automatically.
const fastSession = createExecutionSession("fast");

assert.equal(getActionRisk(action), "destructive");

const fastDecision = evaluateAction(action, fastSession);

assert.equal(fastDecision.allowed, true);
assert.equal(fastDecision.requiresConfirmation, false);

console.log("PASS: Fast Mode automatically allows destructive actions.");

// 4. Emergency Stop: block further actions in Manual Mode.
manualSession.emergencyStop();

const stoppedManual = evaluateAction(action, manualSession, {
  actionId: "action_1",
  approved: true,
});

assert.equal(stoppedManual.allowed, false);

console.log("PASS: Emergency Stop blocks Manual Mode.");

// 5. Emergency Stop: block further actions in Fast Mode.
fastSession.emergencyStop();

const stoppedFast = evaluateAction(action, fastSession);

assert.equal(stoppedFast.allowed, false);

console.log("PASS: Emergency Stop blocks Fast Mode.");

console.log("\nAll execution manager tests passed.");

test("creates an API Mode session", () => {
  const session = createExecutionSession("manual", "api");
  assert.equal(session.controlMode, "api");
});

test("creates a GUI Mode session", () => {
  const session = createExecutionSession("manual", "gui");
  assert.equal(session.controlMode, "gui");
});

test("defaults existing sessions to API Mode", () => {
  const session = createExecutionSession("fast");
  assert.equal(session.controlMode, "api");
});

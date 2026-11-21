
import assert from "node:assert/strict";
import { generateEditingPlan } from "../src/agents/planner/editingPlanner.js";

async function main() {
  console.log("Testing AI editing planner with Ollama...");

  // Retrieve the live DaVinci Resolve timeline.
  const response = await fetch("http://127.0.0.1:8765/resolve/status");

  if (!response.ok) {
    throw new Error(`Resolve status request failed: ${response.status}`);
  }

  const status = await response.json();

  if (!status.timeline) {
    throw new Error("No active DaVinci Resolve timeline found.");
  }

  console.log("Live timeline retrieved successfully.");

  const plan = await generateEditingPlan(
    {
      provider: "ollama",
      model: "qwen3:4b",
    },
    "Analyse my timeline and suggest ways to improve pacing by identifying unnecessary pauses. Do not execute any changes.",
    status.timeline,
  );

  assert.ok(plan.summary.length > 0, "Plan summary should not be empty.");
  assert.ok(Array.isArray(plan.actions), "Actions should be an array.");
  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.status, "pending_approval");

  for (const action of plan.actions) {
    assert.equal(action.requiresApproval, true);
    assert.ok(action.description.length > 0);
    assert.ok(action.reason.length > 0);
    assert.ok(action.target.length > 0);
  }

  console.log("\nGenerated editing plan:");
  console.log(JSON.stringify(plan, null, 2));
  console.log("\nEditing planner test passed.");
}

main().catch((error) => {
  console.error("Editing planner test failed:", error);
  process.exitCode = 1;
});

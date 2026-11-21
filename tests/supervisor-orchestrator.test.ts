import test from "node:test";
import assert from "node:assert/strict";
import { createSupervisedPlan } from "../src/agents/supervisorOrchestrator.js";
import type { EditingPlan } from "../src/agents/planner/editingPlanner.js";

const samplePlan: EditingPlan = {
  summary: "Analyse and improve the timeline",
  warnings: [],
  requiresApproval: true,
  status: "pending_approval",
  actions: [
    {
      id: "analysis-1",
      type: "analyze_timeline",
      description: "Analyse the timeline",
      reason: "Understand the footage",
      target: "Timeline",
      clip_targets: [],
      parameters: {},
      requiresApproval: true,
    },
    {
      id: "stabilize-1",
      type: "stabilize_clip",
      description: "Stabilize shaky footage",
      reason: "Improve visual stability",
      target: "Video clip",
      clip_targets: [
        {
          unique_id: "clip-123",
          track_type: "video",
          track_index: 1,
          start_frame: 100,
          end_frame: 200,
        },
      ],
      parameters: {},
      requiresApproval: true,
    },
    {
      id: "color-1",
      type: "adjust_color",
      description: "Correct clip colours",
      reason: "Improve visual consistency",
      target: "Video clip",
      clip_targets: [
        {
          unique_id: "clip-456",
          track_type: "video",
          track_index: 2,
          start_frame: 200,
          end_frame: 300,
        },
      ],
      parameters: {},
      requiresApproval: true,
    },
    {
      id: "audio-1",
      type: "adjust_audio",
      description: "Adjust audio levels",
      reason: "Improve audio balance",
      target: "Audio clip",
      clip_targets: [
        {
          unique_id: "clip-789",
          track_type: "audio",
          track_index: 1,
          start_frame: 100,
          end_frame: 250,
        },
      ],
      parameters: {},
      requiresApproval: true,
    },
  ],
};

test("assigns stabilization to the Finishing Agent", () => {
  const result = createSupervisedPlan(samplePlan);
  assert.equal(
    result.tasks.find((task) => task.id === "stabilize-1")?.agentId,
    "finishing-agent",
  );
});

test("assigns colour correction to the Colorist", () => {
  const result = createSupervisedPlan(samplePlan);
  assert.equal(
    result.tasks.find((task) => task.id === "color-1")?.agentId,
    "colorist",
  );
});

test("assigns audio adjustments to the Audio Engineer", () => {
  const result = createSupervisedPlan(samplePlan);
  assert.equal(
    result.tasks.find((task) => task.id === "audio-1")?.agentId,
    "audio-engineer",
  );
});

test("assigns timeline analysis to the Media Analyst", () => {
  const result = createSupervisedPlan(samplePlan);
  assert.equal(
    result.tasks.find((task) => task.id === "analysis-1")?.agentId,
    "media-analyst",
  );
});

test("editing tasks wait for timeline analysis", () => {
  const result = createSupervisedPlan(samplePlan);

  assert.deepEqual(
    result.readyTasks.map((task) => task.id),
    ["analysis-1"],
  );

  result.coordinator.claimTask("analysis-1");
  result.coordinator.completeTask("analysis-1");

  assert.equal(result.coordinator.getReadyTasks().length, 3);
});

test("uses shared timeline read locks for analysis and exclusive write locks for editing", () => {
  const plan = createSupervisedPlan({
    summary: "Locking test",
    actions: [
      {
        id: "analysis_1",
        type: "analyze_timeline",
        description: "Analyze timeline",
        reason: "Testing",
        target: "Timeline",
        clip_targets: [],
        parameters: {},
        requiresApproval: true,
      },
      {
        id: "edit_1",
        type: "adjust_color",
        description: "Adjust colour",
        reason: "Testing",
        target: "Timeline",
        clip_targets: [],
        parameters: {},
        requiresApproval: true,
      },
    ],
    warnings: [],
    requiresApproval: true,
    status: "pending_approval",
  });

  const analysis = plan.tasks.find(task => task.id === "analysis_1");
  const editing = plan.tasks.find(task => task.id === "edit_1");

  assert.equal(analysis?.resources[0], "timeline");
  assert.equal(analysis?.lockMode, "read");

  assert.equal(editing?.resources[0], "timeline");
  assert.equal(editing?.lockMode, "write");
});

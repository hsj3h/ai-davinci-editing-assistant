import test from "node:test";
import assert from "node:assert/strict";
import { TaskCoordinator } from "../src/agents/taskCoordinator.js";

test("allows independent analysis tasks to run in parallel", () => {
  const coordinator = new TaskCoordinator();

  coordinator.addTask({
    id: "analysis-1",
    agentId: "media-analyst",
    capability: "analyze_timeline",
    description: "Analyse video timeline",
    dependencies: [],
    resources: ["timeline"],
    lockMode: "read",
  });

  coordinator.addTask({
    id: "analysis-2",
    agentId: "audio-engineer",
    capability: "identify_silence",
    description: "Analyse audio timeline",
    dependencies: [],
    resources: ["timeline"],
    lockMode: "read",
  });

  assert.equal(coordinator.getReadyTasks().length, 2);

  coordinator.claimTask("analysis-1");
  coordinator.claimTask("analysis-2");

  assert.equal(
    coordinator.getTasks().filter((task) => task.status === "running").length,
    2,
  );
});

test("waits for dependencies before starting a task", () => {
  const coordinator = new TaskCoordinator();

  coordinator.addTask({
    id: "analysis",
    agentId: "media-analyst",
    capability: "analyze_timeline",
    description: "Analyse footage",
    dependencies: [],
    resources: ["timeline"],
    lockMode: "read",
  });

  coordinator.addTask({
    id: "edit",
    agentId: "video-editor",
    capability: "trim_clip",
    description: "Trim footage",
    dependencies: ["analysis"],
    resources: ["clip-1"],
    lockMode: "write",
  });

  assert.equal(coordinator.getReadyTasks().length, 1);

  coordinator.claimTask("analysis");
  coordinator.completeTask("analysis");

  assert.equal(coordinator.getReadyTasks()[0].id, "edit");
});

test("blocks conflicting edits by different tasks from the same agent", () => {
  const coordinator = new TaskCoordinator();

  for (const id of ["edit-1", "edit-2"]) {
    coordinator.addTask({
      id,
      agentId: "video-editor",
      capability: "trim_clip",
      description: "Edit the same clip",
      dependencies: [],
      resources: ["clip-1"],
      lockMode: "write",
    });
  }

  coordinator.claimTask("edit-1");

  assert.throws(
    () => coordinator.claimTask("edit-2"),
    /resources are locked/,
  );
});

test("releases resources after task failure", () => {
  const coordinator = new TaskCoordinator();

  coordinator.addTask({
    id: "edit",
    agentId: "video-editor",
    capability: "trim_clip",
    description: "Trim footage",
    dependencies: [],
    resources: ["clip-1"],
    lockMode: "write",
  });

  coordinator.claimTask("edit");
  coordinator.failTask("edit", "Editing failed");

  assert.equal(coordinator.getActiveLocks().length, 0);
  assert.equal(coordinator.getTasks()[0].status, "failed");
});

test("rejects unsupported agent capabilities", () => {
  const coordinator = new TaskCoordinator();

  assert.throws(
    () =>
      coordinator.addTask({
        id: "wrong-task",
        agentId: "colorist",
        capability: "trim_clip",
        description: "Trim footage",
        dependencies: [],
        resources: ["clip-1"],
        lockMode: "write",
      }),
    /does not support/,
  );
});

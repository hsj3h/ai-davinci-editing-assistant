import type { EditingAction } from "../planner/editingPlanner.js";
import {
  evaluateAction,
  type ActionApproval,
  type ExecutionSession,
} from "./executionManager.js";
import { runResolveExecutor } from "../../resolve/resolveExecutor.js";

const supportedOperations = new Set([
  "stabilize_clip",
]);

export async function executeEditingAction(
  action: EditingAction,
  session: ExecutionSession,
  approval?: ActionApproval,
): Promise<Record<string, unknown>> {
  const decision = evaluateAction(action, session, approval);

  if (!decision.allowed) {
    throw new Error(decision.reason);
  }

  if (session.isStopped()) {
    throw new Error("Execution stopped by Emergency Stop.");
  }

  if (!supportedOperations.has(action.type)) {
    throw new Error(
      `Execution is not implemented for action: ${action.type}`,
    );
  }

  if (action.clip_targets.length !== 1) {
    throw new Error(
      "This operation requires exactly one target clip.",
    );
  }

  const target = action.clip_targets[0];

  if (!target.unique_id?.trim()) {
    throw new Error("A valid target clip ID is required.");
  }

  if (target.track_type !== "video") {
    throw new Error("Stabilization is only supported for video clips.");
  }

  if (session.isStopped()) {
    throw new Error("Execution stopped by Emergency Stop.");
  }

  return runResolveExecutor({
    operation: "stabilize_clip",
    unique_id: target.unique_id,
  });
}

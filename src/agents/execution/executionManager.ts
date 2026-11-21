
import type { ExecutionMode } from "../../config/modelConfig.js";
import type { ControlMode } from "../../config/controlMode.js";
import type { EditingAction } from "../planner/editingPlanner.js";

export type ActionRisk = "non_destructive" | "destructive";

export type ActionApproval = {
  actionId: string;
  approved: boolean;
};

export interface ExecutionDecision {
  actionId: string;
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
}

export interface ExecutionSession {
  mode: ExecutionMode;
  controlMode: ControlMode;
  isStopped: () => boolean;
  emergencyStop: () => void;
}

const destructiveActionTypes = new Set<string>([
  "remove_silence",
  "trim_clip",
  "reorder_clips",
]);

export function getActionRisk(action: EditingAction): ActionRisk {
  return destructiveActionTypes.has(action.type)
    ? "destructive"
    : "non_destructive";
}

export function evaluateAction(
  action: EditingAction,
  session: ExecutionSession,
  approval?: ActionApproval,
): ExecutionDecision {
  if (session.isStopped()) {
    return {
      actionId: action.id,
      allowed: false,
      requiresConfirmation: false,
      reason: "Execution stopped by Emergency Stop.",
    };
  }

  if (session.mode === "fast") {
    return {
      actionId: action.id,
      allowed: true,
      requiresConfirmation: false,
      reason: "Fast Mode automatically authorises this editing action.",
    };
  }

  const isApproved =
    approval?.actionId === action.id &&
    approval.approved === true;

  return {
    actionId: action.id,
    allowed: isApproved,
    requiresConfirmation: !isApproved,
    reason: isApproved
      ? "Action approved in Manual Mode."
      : "Manual Mode requires individual action approval.",
  };
}

export function createExecutionSession(
  mode: ExecutionMode,
  controlMode: ControlMode = "api",
): ExecutionSession {
  let stopped = false;

  return {
    mode,
    controlMode,
    isStopped: () => stopped,
    emergencyStop: () => {
      stopped = true;
    },
  };
}

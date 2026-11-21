
import type { EditingPlan } from "./planner/editingPlanner.js";
import { TaskCoordinator, type AgentTask } from "./taskCoordinator.js";

const assignment: Record<
  string,
  { agentId: string; capability: string }
> = {
  analyze_timeline: {
    agentId: "media-analyst",
    capability: "analyze_timeline",
  },
  identify_silence: {
    agentId: "audio-engineer",
    capability: "identify_silence",
  },
  remove_silence: {
    agentId: "video-editor",
    capability: "remove_silence",
  },
  trim_clip: {
    agentId: "video-editor",
    capability: "trim_clip",
  },
  add_transition: {
    agentId: "video-editor",
    capability: "add_transition",
  },
  adjust_audio: {
    agentId: "audio-engineer",
    capability: "adjust_audio",
  },
  adjust_color: {
    agentId: "colorist",
    capability: "adjust_color",
  },
  stabilize_clip: {
    agentId: "finishing-agent",
    capability: "stabilize_clip",
  },
  reorder_clips: {
    agentId: "video-editor",
    capability: "reorder_clips",
  },
};

function isAnalysisAction(type: string): boolean {
  return type === "analyze_timeline" ||
    type === "identify_silence";
}

export interface SupervisedPlan {
  summary: string;
  tasks: AgentTask[];
  readyTasks: AgentTask[];
  coordinator: TaskCoordinator;
}

export function createSupervisedPlan(
  plan: EditingPlan
): SupervisedPlan {
  if (!Array.isArray(plan.actions)) {
    throw new Error("Invalid editing plan actions.");
  }

  const coordinator = new TaskCoordinator();

  const analysisIds = plan.actions
    .filter(action => isAnalysisAction(action.type))
    .map(action => action.id);

  for (const action of plan.actions) {
    const target = assignment[action.type];

    if (!target) {
      throw new Error(
        `No agent assignment for action: ${action.type}`
      );
    }

    const analysis = isAnalysisAction(action.type);

    coordinator.addTask({
      id: action.id,
      agentId: target.agentId,
      capability: target.capability,
      description: action.description,
      dependencies: analysis ? [] : analysisIds,
      resources: ["timeline"],
      lockMode: analysis ? "read" : "write",
    });
  }

  return {
    summary: plan.summary,
    tasks: coordinator.getTasks(),
    readyTasks: coordinator.getReadyTasks(),
    coordinator,
  };
}

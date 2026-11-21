export type AgentRole =
  | "supervisor"
  | "media_analyst"
  | "video_editor"
  | "audio_engineer"
  | "colorist"
  | "finishing_agent";

export interface AgentDefinition {
  id: string;
  name: string;
  role: AgentRole;
  color: string;
  responsibilities: string[];
  capabilities: string[];
}

export const agentRegistry: AgentDefinition[] = [
  {
    id: "supervisor",
    name: "Supervisor",
    role: "supervisor",
    color: "#A78BFA",
    responsibilities: ["Plan tasks", "Assign agents", "Coordinate workflows"],
    capabilities: ["plan_workflow", "coordinate_agents"],
  },
  {
    id: "media-analyst",
    name: "Media Analyst",
    role: "media_analyst",
    color: "#38BDF8",
    responsibilities: ["Inspect footage", "Analyse timeline", "Identify issues"],
    capabilities: ["analyze_timeline", "identify_silence"],
  },
  {
    id: "video-editor",
    name: "Video Editor",
    role: "video_editor",
    color: "#34D399",
    responsibilities: ["Rough cuts", "Fine editing", "Clip arrangement"],
    capabilities: ["trim_clip", "remove_silence", "reorder_clips", "add_transition"],
  },
  {
    id: "audio-engineer",
    name: "Audio Engineer",
    role: "audio_engineer",
    color: "#FBBF24",
    responsibilities: ["Audio cleanup", "Audio adjustments", "Mixing"],
    capabilities: ["adjust_audio", "identify_silence"],
  },
  {
    id: "colorist",
    name: "Colorist",
    role: "colorist",
    color: "#FB7185",
    responsibilities: ["Colour correction", "Colour grading"],
    capabilities: ["adjust_color"],
  },
  {
    id: "finishing-agent",
    name: "Finishing Agent",
    role: "finishing_agent",
    color: "#F97316",
    responsibilities: ["Stabilization", "Final quality checks"],
    capabilities: ["stabilize_clip", "analyze_timeline"],
  },
];

export function getAgentById(id: string): AgentDefinition | undefined {
  return agentRegistry.find((agent) => agent.id === id);
}

export function getAgentsByCapability(capability: string): AgentDefinition[] {
  return agentRegistry.filter((agent) =>
    agent.capabilities.includes(capability),
  );
}

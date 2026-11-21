
import { runAI } from "../modelManager.js";
import type { ModelSelection } from "../modelManager.js";

export type EditingActionType =
  | "analyze_timeline"
  | "identify_silence"
  | "remove_silence"
  | "trim_clip"
  | "add_transition"
  | "adjust_audio"
  | "adjust_color"
  | "stabilize_clip"
  | "reorder_clips";

export interface ClipTarget {
  unique_id: string;
  track_type: "video" | "audio";
  track_index: number;
  start_frame: number;
  end_frame: number;
}

export interface EditingAction {
  id: string;
  type: EditingActionType;
  description: string;
  reason: string;
  target: string;
  clip_targets: ClipTarget[];
  parameters: Record<string, unknown>;
  requiresApproval: true;
}

export interface EditingPlan {
  summary: string;
  actions: EditingAction[];
  warnings: string[];
  requiresApproval: true;
  status: "pending_approval";
}

interface TimelineClipRecord {
  unique_id: string;
  track_type: "video" | "audio";
  track_index: number;
  start_frame: number;
  end_frame: number;
}

const allowedActionTypes: EditingActionType[] = [
  "analyze_timeline",
  "identify_silence",
  "remove_silence",
  "trim_clip",
  "add_transition",
  "adjust_audio",
  "adjust_color",
  "stabilize_clip",
  "reorder_clips",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTimelineClips(timeline: unknown): TimelineClipRecord[] {
  if (!isRecord(timeline) || !Array.isArray(timeline.tracks)) {
    throw new Error("Invalid timeline structure.");
  }

  const clips: TimelineClipRecord[] = [];

  for (const track of timeline.tracks) {
    if (!isRecord(track) || !Array.isArray(track.clips)) {
      throw new Error("Invalid timeline track structure.");
    }

    for (const clip of track.clips) {
      if (!isRecord(clip)) {
        throw new Error("Invalid timeline clip structure.");
      }

      if (
        typeof clip.unique_id !== "string" ||
        (clip.track_type !== "video" && clip.track_type !== "audio") ||
        !Number.isInteger(clip.track_index) ||
        !Number.isInteger(clip.start_frame) ||
        !Number.isInteger(clip.end_frame)
      ) {
        throw new Error("Timeline contains a clip with invalid identification data.");
      }

      clips.push({
        unique_id: clip.unique_id,
        track_type: clip.track_type,
        track_index: clip.track_index as number,
        start_frame: clip.start_frame as number,
        end_frame: clip.end_frame as number,
      });
    }
  }

  return clips;
}

function validateClipTarget(
  value: unknown,
  timelineClips: TimelineClipRecord[],
): ClipTarget {
  if (!isRecord(value)) {
    throw new Error("Invalid clip target in editing plan.");
  }

  const {
    unique_id,
    track_type,
    track_index,
    start_frame,
    end_frame,
  } = value;

  if (
    typeof unique_id !== "string" ||
    !unique_id.trim() ||
    (track_type !== "video" && track_type !== "audio") ||
    !Number.isInteger(track_index) ||
    !Number.isInteger(start_frame) ||
    !Number.isInteger(end_frame)
  ) {
    throw new Error("Editing plan contains an incomplete clip target.");
  }

  const actualClip = timelineClips.find(
    (clip) => clip.unique_id === unique_id,
  );

  if (!actualClip) {
    throw new Error(`Unknown clip ID in editing plan: ${unique_id}`);
  }

  if (
    actualClip.track_type !== track_type ||
    actualClip.track_index !== track_index ||
    actualClip.start_frame !== start_frame ||
    actualClip.end_frame !== end_frame
  ) {
    throw new Error(
      `Clip target does not match the current timeline: ${unique_id}`,
    );
  }

  return {
    unique_id,
    track_type,
    track_index: track_index as number,
    start_frame: start_frame as number,
    end_frame: end_frame as number,
  };
}

export async function generateEditingPlan(
  selection: ModelSelection,
  instruction: string,
  timelineContext: unknown,
): Promise<EditingPlan> {
  if (!instruction.trim()) {
    throw new Error("Please enter an editing instruction.");
  }

  if (!timelineContext) {
    throw new Error("No DaVinci Resolve timeline data was provided.");
  }

  const serializedTimeline = JSON.stringify(timelineContext);

  if (!serializedTimeline || serializedTimeline.length > 500000) {
    throw new Error("Timeline data is empty or too large to analyze.");
  }

  const timelineClips = getTimelineClips(timelineContext);

  const prompt = `
You are an expert DaVinci Resolve video editing assistant.

Analyze the actual timeline data and the user's editing instruction.

ACTUAL DAVINCI RESOLVE TIMELINE DATA:
${serializedTimeline}

USER INSTRUCTION:
${instruction}

Rules:

- Use the supplied timeline as the only source of truth.
- Every clip target must use its exact unique_id from the timeline.
- Copy track_type, track_index, start_frame and end_frame exactly.
- Never invent clip IDs, tracks, frames or properties.
- Use an empty clip_targets array for general timeline analysis.
- Every other action must identify at least one exact clip.
- Use parameters as a JSON object containing the requested operation settings.
- Do not put new frame positions in the clip target.
- For trim or reorder proposals, put requested changes in parameters.
- Do not assume that a timeline gap represents silence.
- Do not claim that any operation has been executed.
- Only propose actions relevant to the user's instruction.
- For stabilization requests, use the "stabilize_clip" action type.
- Stabilization targets must be video clips, never audio clips.
- Only propose stabilization when the user requests it or the timeline analysis identifies noticeable unwanted camera shake.
- Include the exact target clip in clip_targets.
- Do not invent stabilization settings such as strength or smoothness; the current Resolve scripting operation uses Stabilize() without configurable parameters.
- Do not propose unsupported or unspecified operations.
- Never execute an action.

Return ONLY valid JSON in this structure:

{
  "summary": "Editing approach",
  "actions": [
    {
      "id": "action_1",
      "type": "analyze_timeline",
      "description": "Description",
      "reason": "Reason",
      "target": "Timeline element",
      "clip_targets": [],
      "parameters": {}
    }
  ],
  "warnings": []
}

Allowed action types:
${allowedActionTypes.join(", ")}

Return no Markdown or code fences.
`;

  const response = await runAI(selection, prompt);

  const cleanedResponse = response
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonStart = cleanedResponse.indexOf("{");

  if (jsonStart === -1) {
    throw new Error("The AI response does not contain a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let jsonEnd = -1;

  for (let i = jsonStart; i < cleanedResponse.length; i++) {
    const char = cleanedResponse[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        jsonEnd = i;
        break;
      }
    }
  }

  if (jsonEnd === -1) {
    throw new Error("The AI returned incomplete JSON.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(
      cleanedResponse.slice(jsonStart, jsonEnd + 1),
    );
  } catch {
    throw new Error("The AI returned invalid JSON. Please try again.");
  }

  if (
    !isRecord(parsed) ||
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.actions) ||
    !Array.isArray(parsed.warnings)
  ) {
    throw new Error("The AI returned an incomplete editing plan.");
  }

  if (parsed.actions.length > 30) {
    throw new Error("The editing plan contains too many actions.");
  }

  const actions: EditingAction[] = parsed.actions.map(
    (action: unknown, index: number) => {
      if (!isRecord(action)) {
        throw new Error(`Invalid editing action at position ${index + 1}.`);
      }

      if (
        typeof action.type !== "string" ||
        !allowedActionTypes.includes(action.type as EditingActionType) ||
        typeof action.description !== "string" ||
        !action.description.trim() ||
        typeof action.reason !== "string" ||
        !action.reason.trim() ||
        typeof action.target !== "string" ||
        !action.target.trim() ||
        !Array.isArray(action.clip_targets) ||
        !isRecord(action.parameters)
      ) {
        throw new Error(`Invalid editing action at position ${index + 1}.`);
      }

      if (action.clip_targets.length > 10) {
        throw new Error("An action cannot target more than 10 clips.");
      }

      const clipTargets = action.clip_targets.map((target: unknown) =>
        validateClipTarget(target, timelineClips),
      );

      const actionType = action.type as EditingActionType;

      if (actionType !== "analyze_timeline" && clipTargets.length === 0) {
        throw new Error(
          `Action ${index + 1} must identify at least one clip.`,
        );
      }

      return {
        id: `action_${index + 1}`,
        type: actionType,
        description: action.description,
        reason: action.reason,
        target: action.target,
        clip_targets: clipTargets,
        parameters: action.parameters,
        requiresApproval: true,
      };
    },
  );

  const warnings = parsed.warnings.map((warning: unknown) => {
    if (typeof warning !== "string") {
      throw new Error("The editing plan contains an invalid warning.");
    }

    return warning;
  });

  return {
    summary: parsed.summary,
    actions,
    warnings,
    requiresApproval: true,
    status: "pending_approval",
  };
}

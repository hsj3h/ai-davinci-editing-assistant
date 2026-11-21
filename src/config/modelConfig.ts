export type Provider = "ollama" | "claude" | "openai";

export interface ModelOption {
  id: string;
  name: string;
}

export const providerConfig = {
  ollama: {
    name: "Ollama (Local)",
    requiresApiKey: false,
    models: [] as ModelOption[],
  },
  claude: {
    name: "Claude",
    requiresApiKey: true,
    models: [
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5" },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
    ],
  },
  openai: {
    name: "ChatGPT (OpenAI)",
    requiresApiKey: true,
    models: [],
  },
};
export type ExecutionMode = "manual" | "fast";

export const executionModeConfig = {
  manual: {
    name: "Manual Approval",
    description: "Review and approve each editing action before execution.",
    requiresApproval: true,
    autoExecute: false,
  },
  fast: {
    name: "Fast Mode",
    description: "Automatically execute permitted non-destructive actions.",
    requiresApproval: false,
    autoExecute: true,
  },
} as const;
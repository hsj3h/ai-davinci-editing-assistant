import { askClaude } from "../providers/claude.js";
import { askOpenAI } from "../providers/openai.js";
import {
  listOllamaModels,
  generateOllamaResponse,
} from "../providers/ollama.js";
import type { Provider } from "../config/modelConfig.js";

export interface ModelSelection {
  provider: Provider;
  model: string;
}

export async function runAI(
  selection: ModelSelection,
  prompt: string
): Promise<string> {
  if (!selection.model.trim()) {
    throw new Error("Please select an AI model.");
  }

  if (!prompt.trim()) {
    throw new Error("Please enter an instruction.");
  }

  switch (selection.provider) {
    case "ollama": {
      const models = await listOllamaModels();

      if (!models.some((item) => item.name === selection.model)) {
        throw new Error("Selected Ollama model is not installed.");
      }

      return generateOllamaResponse(selection.model, prompt);
    }

    case "claude":
      return askClaude(selection.model, prompt);

    case "openai":
      return askOpenAI(selection.model, prompt);

    default:
      throw new Error("Unsupported AI provider.");
  }
}

import { listOllamaModels } from "./ollama.js";
import { providerConfig } from "../config/modelConfig.js";

export async function loadAvailableModels() {
  try {
    const models = await listOllamaModels();

    providerConfig.ollama.models = models.map((model) => ({
      id: model.name,
      name: model.name,
    }));

    return providerConfig;
  } catch (error) {
    console.error("Could not load Ollama models:", error);
    return providerConfig;
  }
}

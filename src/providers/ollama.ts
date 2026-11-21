export interface OllamaModel {
  name: string;
  size: number;
  capabilities: string[];
}

interface OllamaTagsResponse {
  models: {
    name: string;
    size: number;
    capabilities?: string[];
  }[];
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

const BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';

export async function listOllamaModels(): Promise<OllamaModel[]> {
  const response = await fetch(`${BASE_URL}/api/tags`);

  if (!response.ok) {
    throw new Error(`Ollama connection failed: ${response.status}`);
  }

  const data = await response.json() as OllamaTagsResponse;

  return data.models.map((model) => ({
    name: model.name,
    size: model.size,
    capabilities: model.capabilities ?? [],
  }));
}

export async function generateOllamaResponse(
  model: string,
  prompt: string,
): Promise<string> {
  if (!model.trim() || !prompt.trim()) {
    throw new Error('Model and prompt are required.');
  }

  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
      think: false,
      stream: false,
    }),
    signal: AbortSignal.timeout(300000),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama generation failed: ${response.status} ${await response.text()}`
    );
  }

  const data = await response.json() as OllamaChatResponse;

  return data.message.content;
}

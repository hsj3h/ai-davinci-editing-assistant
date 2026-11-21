import OpenAI from "openai";

export async function askOpenAI(
  model: string,
  prompt: string
): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.create({
    model,
    input: prompt,
  });

  return response.output_text;
}

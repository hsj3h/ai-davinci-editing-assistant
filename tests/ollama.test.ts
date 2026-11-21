import { listOllamaModels } from "../src/providers/ollama.js";

async function testOllama() {
  console.log("Testing Ollama connection...\n");

  try {
    const models = await listOllamaModels();

    console.log("Connected successfully!");
    console.log(`Models detected: ${models.length}\n`);

    for (const model of models) {
      console.log(`- ${model.name}`);
    }
  } catch (error) {
    console.error("Test failed:", error);
    process.exitCode = 1;
  }
}

testOllama();

import { runAI } from "../src/agents/modelManager.js";

async function test() {
  try {
    console.log("Testing AI model manager with Ollama...\n");

    const result = await runAI(
      {
        provider: "ollama",
        model: "qwen3:4b",
      },
      "Explain what a video editing timeline is in two simple sentences."
    );

    console.log("AI response:\n");
    console.log(result);
  } catch (error) {
    console.error("Test failed:", error);
    process.exitCode = 1;
  }
}

test();

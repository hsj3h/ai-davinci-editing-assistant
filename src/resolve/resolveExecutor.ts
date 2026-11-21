import { spawn } from "node:child_process";
import { resolve } from "node:path";

const PYTHON =
  "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Applications/ResolvePython";

export interface ResolveExecutorCommand {
  operation: "inspect_clip" | "inspect_properties" | "stabilize_clip";
  unique_id: string;
}

export async function runResolveExecutor(
  command: ResolveExecutorCommand,
): Promise<Record<string, unknown>> {
  if (!command.unique_id.trim()) {
    throw new Error("A valid clip unique_id is required.");
  }

  const scriptPath = resolve(
    process.cwd(),
    "python/resolve_executor.py",
  );

  return new Promise((resolveResult, reject) => {
    const child = spawn(PYTHON, [scriptPath], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Resolve executor timed out."));
    }, 300000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (data: string) => {
      stdout += data;
    });

    child.stderr.on("data", (data: string) => {
      stderr += data;
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      let result: Record<string, unknown>;

      try {
        result = JSON.parse(stdout.trim());
      } catch {
        reject(
          new Error(
            `Invalid Resolve executor response. ${stderr}`,
          ),
        );
        return;
      }

      if (code !== 0 || result.success !== true) {
        reject(
          new Error(
            String(result.error ?? stderr ?? "Resolve operation failed."),
          ),
        );
        return;
      }

      resolveResult(result);
    });

    child.stdin.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.stdin.end(JSON.stringify(command));
  });
}

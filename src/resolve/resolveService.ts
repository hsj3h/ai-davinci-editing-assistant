import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);

const PYTHON =
  '/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Applications/ResolvePython';

export async function getResolveStatus() {
  const scriptPath = resolve(process.cwd(), 'python/resolve_bridge.py');

  const { stdout } = await execFileAsync(PYTHON, [scriptPath], {
    timeout: 15000,
    maxBuffer: 10 * 1024 * 1024,
  });

  return JSON.parse(stdout.trim());
}

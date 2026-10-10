import { describe, expect, it } from "vitest";
import { runShell } from "../src/run-shell";

/**
 * A command whose shell starts a node that starts another node, which
 * prints its pid and, like its parent, never exits. Both hold the pipes.
 */
const HANGS = `node -e "require('child_process').spawn(process.execPath, ['-e', 'console.log(process.pid); setInterval(() => {}, 1000)'], { stdio: 'inherit' }); setInterval(() => {}, 1000)"`;

/**
 * Reports whether a process is still running.
 *
 * @param pid - the process id
 * @returns `true` while the process exists
 */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Waits until a process has exited, or a deadline passes.
 *
 * @param pid - the process id
 * @param ms - how long to wait at most, in milliseconds
 * @returns whether the process has exited
 */
async function exits(pid: number, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (alive(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !alive(pid);
}

describe("runShell", () => {
  it("answers a command's exit code and output", async () => {
    // Act
    const result = await runShell(`node -e "console.log('hi'); process.exit(3)"`, {
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 30_000,
    });

    // Assert
    expect(result.code).toBe(3);
    expect(result.output.trim()).toBe("hi");
  });

  it("kills a command past its timeout with every process it started, and says so", async () => {
    // Act
    const result = await runShell(HANGS, {
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 1_500,
    });

    // Assert
    expect(result.code).toBe(1);
    expect(result.output).toContain("killed after 1.5 s");
    const pid = Number(result.output.trim().split("\n")[0]);
    expect(Number.isInteger(pid) && pid > 0).toBe(true);
    expect(await exits(pid, 5_000)).toBe(true);
  }, 15_000);
});

/**
 * Runs a shell command to its end, or kills it and every process it
 * started once it runs too long.
 *
 * @module
 */
import { spawn } from "node:child_process";

/** How {@link runShell} runs a command. */
export interface ShellOptions {
  /** The working directory. */
  cwd: string;
  /** The whole environment the command sees. */
  env: NodeJS.ProcessEnv;
  /** How long it may run before it is killed, in milliseconds. */
  timeoutMs: number;
}

/** How a command ended. */
export interface ShellResult {
  /** Its exit code; 1 when it was killed or ended on a signal. */
  code: number;
  /** Its stdout and stderr, interleaved as they arrived. */
  output: string;
}

/**
 * Kills a process and every process it started. On Windows a kill reaches
 * only the process itself (the shell), so `taskkill /T` walks the tree; on
 * POSIX the command runs as its own process group, which one signal ends.
 *
 * @param pid - the process id of the command's shell
 * @returns once the kill was sent; a tree that has already exited is no failure
 */
function killTree(pid: number): Promise<void> {
  if (process.platform !== "win32") {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // The group has already exited.
    }
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const taskkill = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    taskkill.on("error", () => resolve());
    taskkill.on("close", () => resolve());
  });
}

/**
 * Runs `command` through the platform's shell with stdin closed. A command
 * still running after `options.timeoutMs` is killed with every process it
 * started, and the result says so, without waiting for its pipes to close.
 *
 * @param command - the command line
 * @param options - where and how long it runs, and its environment
 * @returns its exit code and output once it exits or is killed
 * @throws if the shell can't be started
 */
export function runShell(command: string, options: ShellOptions): Promise<ShellResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: options.cwd,
      env: options.env,
      shell: true,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    let killing = false;
    const timer = setTimeout(() => {
      killing = true;
      const pid = child.pid;
      void (pid === undefined ? Promise.resolve() : killTree(pid)).then(() => {
        child.stdout.destroy();
        child.stderr.destroy();
        const after = `${options.timeoutMs / 1000} s`;
        finish(() => resolve({ code: 1, output: `${output}\nkilled after ${after}` }));
      });
    }, options.timeoutMs);
    /**
     * Settles the run once, whichever of exit, kill or failure comes first.
     *
     * @param settle - resolves or rejects the run
     */
    function finish(settle: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      settle();
    }
    child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.on("error", (err) => finish(() => reject(err)));
    child.on("close", (code) => {
      if (!killing) finish(() => resolve({ code: code ?? 1, output }));
    });
  });
}

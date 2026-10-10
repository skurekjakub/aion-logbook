/**
 * The one door to child processes, so tests can swap in a fake.
 *
 * @module
 */
import { spawn } from "node:child_process";

/** What a finished program left: its exit code and output. */
export interface RunResult {
  /** The exit code; non-zero is a failure the caller reads. */
  code: number;
  /** Standard output. */
  stdout: string;
  /** Standard error. */
  stderr: string;
}

/**
 * Runs a program with arguments in the repo root and resolves with its
 * exit code and output. A non-zero exit resolves; a program that can't be
 * started rejects.
 *
 * @param cmd - program name on PATH
 * @param args - arguments
 * @returns the exit code and output
 * @throws if the program can't be started
 */
export type Runner = (cmd: string, args: readonly string[]) => Promise<RunResult>;

/**
 * Quotes an argument for `cmd.exe`, which `pnpm` needs on Windows, where
 * it is a `.cmd` shim that only a shell can start.
 *
 * @param arg - the argument
 * @returns it in double quotes
 * @throws if it holds a character `cmd.exe` would expand inside quotes
 */
function quoteForCmd(arg: string): string {
  if (/["%!^]/.test(arg)) throw new Error(`refusing to pass ${arg} through cmd.exe`);
  return `"${arg}"`;
}

/**
 * Builds a {@link Runner} that runs programs in `cwd`: directly on POSIX,
 * through `cmd.exe` with every argument quoted on Windows.
 *
 * @param cwd - the directory programs run in
 * @returns the runner
 */
export function nodeRunner(cwd: string): Runner {
  return (cmd, args) =>
    new Promise((resolve, reject) => {
      const windows = process.platform === "win32";
      const child = windows
        ? spawn([cmd, ...args.map(quoteForCmd)].join(" "), { cwd, shell: true, windowsHide: true })
        : spawn(cmd, args, { cwd });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      child.on("error", (err) => {
        reject(new Error(`can't start ${cmd}: ${err.message}`, { cause: err }));
      });
      child.on("close", (code) => {
        resolve({ code: code ?? 1, stdout, stderr });
      });
    });
}

/**
 * The one door to child processes, so tests can swap in a fake.
 *
 * @module
 */
import { execFile } from "node:child_process";

/**
 * Runs a program with arguments and resolves with its exit code and output. A non-zero exit resolves; a program
 * that can't be started, or is killed by a signal, rejects.
 */
export type Runner = (
  cmd: string,
  args: string[],
) => Promise<{ code: number; stdout: string; stderr?: string }>;

/**
 * Runs the program through `execFile`, without a shell and without flashing a console window.
 *
 * @param cmd - program name on PATH, or an absolute path
 * @param args - arguments, passed as is
 * @returns the exit code, stdout and stderr
 * @throws if the program can't be started (not found, not executable) or is killed by a signal; the message
 *   names the signal
 */
export const nodeRunner: Runner = (cmd, args) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true }, (err, stdout, stderr) => {
      if (err && typeof err.code !== "number") {
        const why = err.signal ? `${cmd} was killed by ${err.signal}` : `can't start ${cmd}`;
        reject(new Error(`${why}: ${err.message}`, { cause: err }));
        return;
      }
      resolve({ code: typeof err?.code === "number" ? err.code : 0, stdout, stderr });
    });
  });

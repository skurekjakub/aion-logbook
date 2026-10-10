/**
 * `pnpm capture <command> …`: the entry point. See `USAGE` in
 * `commands.ts` for the commands.
 *
 * @module
 */
import { runCli, USAGE, UsageError } from "./commands";
import { LedgerError } from "./ledger";
import { researchDir } from "./paths";
import { localOffset } from "./time";

try {
  process.exitCode = await runCli(process.argv.slice(2), {
    researchDir,
    // `pnpm capture` runs this script in packages/capture; INIT_CWD is where pnpm was invoked.
    cwd: process.env.INIT_CWD ?? process.cwd(),
    out: (line) => console.log(line),
    err: (line) => console.error(line),
    now: () => new Date(),
    offsetAt: localOffset,
  });
} catch (err) {
  if (err instanceof UsageError) {
    console.error(`${err.message}\n\nUsage:\n  ${USAGE.join("\n  ")}`);
    process.exitCode = 2;
  } else if (err instanceof LedgerError) {
    console.error(err.message);
    process.exitCode = 1;
  } else {
    throw err;
  }
}

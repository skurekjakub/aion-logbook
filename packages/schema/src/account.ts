import { z } from "zod";
import { CLASS } from "./enums";
import { isoDateTime } from "./ledger";

/** The `aion-account-snapshot/1` document: the character as the agent read it from the client. */
export const accountSnapshotFile = z.object({
  schema: z.literal("aion-account-snapshot/1"),
  capturedAt: isoDateTime,
  character: z.object({
    name: z.string().min(1),
    class: z.enum(CLASS),
    level: z.number().int().min(1),
    gearScore: z.number().int().nullable(),
    server: z.string().min(1).nullable(),
  }),
  skills: z.array(
    z.object({
      name: z.string().min(1),
      level: z.number().int().nullable(),
      slot: z.string().nullable(),
    }),
  ),
  stigmas: z.array(z.object({ slotLevel: z.number().int(), name: z.string().min(1).nullable() })),
  macros: z.array(
    z.object({
      name: z.string().min(1),
      key: z.string().nullable(),
      steps: z.array(z.string().min(1)),
    }),
  ),
  screens: z.array(z.string().min(1)),
  unread: z.array(z.string().min(1)),
});
/** Output of {@link accountSnapshotFile}. */
export type AccountSnapshotFile = z.output<typeof accountSnapshotFile>;

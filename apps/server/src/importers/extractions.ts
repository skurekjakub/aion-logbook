import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sourceId } from "@aion/schema";
import { ImportError } from "../errors";

/** The part of an extraction post {@link loadSummaries} reads. */
interface ExtractionPost {
  source_id?: unknown;
  summary_en?: unknown;
}

/**
 * Collects the English summary of every extracted post, keyed by source id.
 *
 * Reads the folders in the order given, and each folder's `*.json` files in
 * file-name order; each file holds a `posts` array whose posts name their
 * source as `source_id` (`<site>:<key>`). A post without a valid source id
 * or a non-empty `summary_en` is skipped. The first summary seen for a
 * source id wins, so an earlier folder's summary (a refresh round's) takes
 * precedence over a later one's.
 *
 * @param dirs - absolute path to each extraction directory
 * @returns a map from source id to its summary
 * @throws {ImportError} naming the file, if one can't be read or isn't
 *   valid JSON
 */
export function loadSummaries(dirs: readonly string[]): Map<string, string> {
  const summaries = new Map<string, string>();
  const files = dirs.flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map((name) => join(dir, name)),
  );
  for (const file of files) {
    let data: { posts?: ExtractionPost[] };
    try {
      data = JSON.parse(readFileSync(file, "utf-8")) as typeof data;
    } catch (err) {
      throw new ImportError(file, null, (err as Error).message);
    }
    for (const post of data.posts ?? []) {
      const id = sourceId.safeParse(post.source_id);
      const summary = post.summary_en;
      if (!id.success || typeof summary !== "string" || summary.trim() === "") continue;
      if (!summaries.has(id.data)) summaries.set(id.data, summary);
    }
  }
  return summaries;
}

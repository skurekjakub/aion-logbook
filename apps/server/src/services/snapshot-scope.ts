import type { CitedEntity } from "@aion/schema";
import { OBSOLESCENCE, parseObsolescenceKey } from "@aion/schema";
import type { TableKey } from "../registry";
import { TABLE_KEYS, recordColumnOf, specOf } from "../registry";
import type { Snapshot } from "./export";

/** A research record whose owned rows differ between two snapshots. */
export interface RecordChange {
  /** The record's slug. */
  record: string;
  /** The tables its rows differ in, in registry order. */
  tables: TableKey[];
}

/**
 * The tables whose rows belong to a row of another table, by the column
 * that names the parent: a child row is compared as part of its parent,
 * and a child of a child as part of the row its parent belongs to. A
 * parent table comes before its children here, as in the registry.
 */
const CHILDREN: Partial<Record<TableKey, { parent: TableKey; column: string }>> = {
  buildSkills: { parent: "builds", column: "buildId" },
  buildStigmas: { parent: "builds", column: "buildId" },
  macros: { parent: "builds", column: "buildId" },
  macroSteps: { parent: "macros", column: "macroId" },
};

/** The table whose rows cite other tables' rows, compared as part of the row each cites for. */
const CITATIONS: TableKey = "citations";

/** The tables of the character, which `pnpm import:account` loads and no record owns. */
const ACCOUNT_TABLES: ReadonlySet<TableKey> = new Set([
  "accountSnapshots",
  "accountSkills",
  "accountStigmas",
  "accountMacros",
  "accountMacroSteps",
  "accountRoadmapItems",
]);

/**
 * How `db:scope` compares a table's rows:
 * - `owned`: a research record owns each row;
 * - `child`: each row belongs to a row of another table ({@link CHILDREN});
 * - `citation`: each row cites for a row of another table;
 * - `account`: the character, owned by no record, compared on its own.
 */
export type ScopeRole = "owned" | "child" | "citation" | "account";

/**
 * Tells how `db:scope` compares a table's rows.
 *
 * @param key - the table
 * @returns its role, or `undefined` for a table the comparison doesn't place
 */
export function scopeRole(key: TableKey): ScopeRole | undefined {
  if (ACCOUNT_TABLES.has(key)) return "account";
  if (key === CITATIONS) return "citation";
  if (CHILDREN[key]) return "child";
  if (recordColumnOf(key) !== undefined) return "owned";
  return undefined;
}

/** A snapshot row as the comparison reads it. */
type Row = Record<string, unknown>;

/** A compared row: its table, its owner, its own columns and what belongs to it. */
interface Entry {
  /** The row's table. */
  key: TableKey;
  /** The record that owns it; `undefined` for a row no record owns. */
  record: string | undefined;
  /** Its columns as JSON, an integer `id` left out. */
  base: string;
  /** Its child rows and citations, each as text. */
  parts: string[];
}

/**
 * A row's columns without the ones import order assigns.
 *
 * @param row - the row
 * @param drop - further columns to leave out
 * @returns the row without an integer `id` and without `drop`
 */
function stripped(row: Row, drop: readonly string[] = []): Row {
  const out: Row = {};
  for (const [column, value] of Object.entries(row)) {
    if (column === "id" && typeof value === "number") continue;
    if (drop.includes(column)) continue;
    out[column] = value;
  }
  return out;
}

/**
 * Reads every compared row of a snapshot, with its child rows and its
 * citations (a reason's among them) folded into it. Integer ids are left
 * out throughout: import order assigns them, so a record that gains or
 * loses a row renumbers every later record's rows.
 *
 * @param snapshot - the snapshot
 * @returns the compared rows
 */
function entries(snapshot: Snapshot): Entry[] {
  const tables = snapshot.tables as Partial<Record<TableKey, Row[]>>;
  const byId = new Map<TableKey, Map<string, Entry>>();
  const byEntity = new Map<CitedEntity, TableKey>();
  const all: Entry[] = [];
  for (const key of TABLE_KEYS) {
    const role = scopeRole(key);
    if (role !== "owned") continue;
    const { entity } = specOf(key);
    if (entity) byEntity.set(entity, key);
    const owner = recordColumnOf(key);
    const ids = new Map<string, Entry>();
    (tables[key] ?? []).forEach((row, index) => {
      const record = owner === undefined ? undefined : row[owner];
      const entry: Entry = {
        key,
        record: typeof record === "string" ? record : undefined,
        base: JSON.stringify(stripped(row)),
        parts: [],
      };
      all.push(entry);
      const id = row.id;
      ids.set(typeof id === "string" || typeof id === "number" ? String(id) : `#${index}`, entry);
    });
    byId.set(key, ids);
  }
  for (const [key, { parent, column }] of Object.entries(CHILDREN) as Array<
    [TableKey, { parent: TableKey; column: string }]
  >) {
    // A child of a child keeps its parent column, so a part says which of the row's children it belongs to.
    const nested = CHILDREN[parent] !== undefined;
    const owners = new Map<string, Entry>();
    for (const row of tables[key] ?? []) {
      const entry = byId.get(parent)?.get(String(row[column]));
      if (!entry) continue;
      entry.parts.push(`${key}:${JSON.stringify(stripped(row, nested ? [] : [column]))}`);
      if (typeof row.id === "string" || typeof row.id === "number")
        owners.set(String(row.id), entry);
    }
    byId.set(key, owners);
  }
  for (const row of tables[CITATIONS] ?? []) {
    const entity = row.entity as CitedEntity;
    const entityId = String(row.entityId);
    const target =
      entity === OBSOLESCENCE ? parseObsolescenceKey(entityId) : { entity, id: entityId };
    const key = target && byEntity.get(target.entity);
    const entry = key ? byId.get(key)?.get(target.id) : undefined;
    entry?.parts.push(`${entity === OBSOLESCENCE ? "reason" : "cites"}:${String(row.sourceId)}`);
  }
  return all;
}

/**
 * A compared row as one string: its columns, then its sorted parts.
 *
 * @param entry - the row
 * @returns the text two snapshots' rows are compared by
 */
function content(entry: Entry): string {
  return [entry.base, ...[...entry.parts].sort()].join("\n");
}

/**
 * Groups compared rows by a label, then by table, each group's contents sorted.
 *
 * @param rows - the rows
 * @param label - a row's group, or `undefined` to leave it out
 * @returns label → table → the rows' contents, sorted
 */
function grouped(
  rows: readonly Entry[],
  label: (entry: Entry) => string | undefined,
): Map<string, Map<TableKey, string[]>> {
  const result = new Map<string, Map<TableKey, string[]>>();
  for (const entry of rows) {
    const group = label(entry);
    if (group === undefined) continue;
    const byTable = result.get(group) ?? new Map<TableKey, string[]>();
    byTable.set(entry.key, [...(byTable.get(entry.key) ?? []), content(entry)]);
    result.set(group, byTable);
  }
  for (const byTable of result.values()) for (const list of byTable.values()) list.sort();
  return result;
}

/**
 * The tables whose grouped contents differ.
 *
 * @param was - the earlier snapshot's contents of one group
 * @param is - the later snapshot's
 * @returns the differing tables, in registry order
 */
function differing(
  was: ReadonlyMap<TableKey, string[]> | undefined,
  is: ReadonlyMap<TableKey, string[]> | undefined,
): TableKey[] {
  return TABLE_KEYS.filter(
    (key) => JSON.stringify(was?.get(key) ?? []) !== JSON.stringify(is?.get(key) ?? []),
  );
}

/**
 * Lists the research records whose owned rows differ between two
 * snapshots, compared by content, integer ids aside. A row's child rows
 * (a build's skills, stigmas, macro chains and their steps) and its
 * citations, a reason's included, count as part of it, so a change to
 * one names the row's record under the row's table.
 *
 * @param before - the earlier snapshot
 * @param after - the later snapshot
 * @returns each record whose rows differ, sorted by slug, with the tables they differ in
 */
export function changedRecords(before: Snapshot, after: Snapshot): RecordChange[] {
  const was = grouped(entries(before), (entry) => entry.record);
  const is = grouped(entries(after), (entry) => entry.record);
  const records = [...new Set([...was.keys(), ...is.keys()])].sort();
  return records.flatMap((record) => {
    const tables = differing(was.get(record), is.get(record));
    return tables.length > 0 ? [{ record, tables }] : [];
  });
}

/**
 * Lists the account tables whose rows differ between two snapshots, row
 * for row, ids included: the account is loaded whole per snapshot, so its
 * ids follow the files.
 *
 * @param before - the earlier snapshot
 * @param after - the later snapshot; a table either lacks counts as empty
 * @returns the differing account tables, in registry order
 */
export function changedAccount(before: Snapshot, after: Snapshot): TableKey[] {
  const was = before.tables as Partial<Record<TableKey, unknown[]>>;
  const is = after.tables as Partial<Record<TableKey, unknown[]>>;
  return TABLE_KEYS.filter(
    (key) =>
      scopeRole(key) === "account" &&
      JSON.stringify(was[key] ?? []) !== JSON.stringify(is[key] ?? []),
  );
}

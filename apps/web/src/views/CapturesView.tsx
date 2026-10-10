import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { capturesQuery } from "../api/queries";
import type { Capture } from "../api/types";
import { CaptureStamp } from "../components/CaptureStamp";
import type { Column } from "../components/DataTable";
import { DataTable } from "../components/DataTable";
import { QueryResult } from "../components/QueryResult";
import { ViewHeader } from "../components/ViewHeader";
import { evidenceFolder, splitPath } from "../lib/captures";
import { optionalText } from "../lib/search";

/** The captures view's search params: a folder, a tool, and a path or URL search. */
export interface CapturesSearch {
  folder?: string;
  tool?: string;
  q?: string;
}

/**
 * Reads the captures view's search params.
 *
 * @param search - the router's decoded query values
 * @returns the folder, tool and search text, each dropped when unusable
 */
export function validateCapturesSearch(search: Record<string, unknown>): CapturesSearch {
  return {
    folder: optionalText(search.folder),
    tool: optionalText(search.tool),
    q: optionalText(search.q),
  };
}

const COLUMNS: Column<Capture>[] = [
  {
    header: "File",
    cell: (c) => {
      const { dir, name } = splitPath(c.path);
      return (
        <span className="capture-file" title={c.path}>
          <span className="capture-dir mono">{dir}</span>
          <span className="capture-name mono">{name}</span>
        </span>
      );
    },
    className: "wide capture-path",
  },
  {
    header: "URL",
    cell: (c) =>
      c.url ? (
        <a className="capture-url" href={c.url} target="_blank" rel="noopener" title={c.url}>
          {c.url}
        </a>
      ) : (
        <span
          className="muted"
          title="The ledger names no URL: a derived file, or one it can't place"
        >
          –
        </span>
      ),
    className: "wide capture-url-cell",
  },
  {
    header: "Captured",
    cell: (c) => <CaptureStamp capturedAt={c.capturedAt} approx={c.approx} />,
    className: "capture-time",
  },
  {
    header: "Tool",
    cell: (c) => (
      <span className="chips src">
        <span className="chip">{c.tool}</span>
      </span>
    ),
    className: "capture-tool",
  },
];

/**
 * Lists the distinct values of a field, sorted, as select options.
 *
 * @param rows - the captures
 * @param value - reads the field
 * @returns `[value, value]` pairs
 */
function options(rows: readonly Capture[], value: (c: Capture) => string) {
  return [...new Set(rows.map(value))].sort().map((v) => [v, v] as const);
}

/** Props for {@link CapturesView}. */
export interface CapturesViewProps {
  /** The research record's slug. */
  slug: string;
  /** The current search params. */
  search: CapturesSearch;
  /** Applies a patch to the search params. */
  onSearch: (patch: CapturesSearch) => void;
}

/**
 * One research record's capture ledger: every evidence file with where it
 * came from, when it was captured and by what, filterable by evidence
 * folder (`?folder=`), tool (`?tool=`) and path or URL (`?q=`).
 *
 * @param props - the record's slug, the search params and their setter
 * @returns the captures view
 */
export function CapturesView({ slug, search: { folder, tool, q }, onSearch }: CapturesViewProps) {
  const captures = useQuery(capturesQuery(slug));
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/research">Research</Link>
        <span aria-hidden="true">/</span>
        <span className="mono">research/{slug}/</span>
      </nav>
      <ViewHeader
        title="Captures"
        lede={[
          "Every evidence file: its URL, capture time and tool.",
          "≈ marks a time backfilled after the fact.",
        ]}
      />
      <QueryResult query={captures} resource="captures">
        {(rows) => (
          <DataTable
            columns={COLUMNS}
            rows={rows}
            rowKey={(c) => c.id}
            filter={{
              value: q ?? "",
              onChange: (v) => onSearch({ q: v }),
              text: (c) => `${c.path} ${c.url ?? ""}`,
              placeholder: "Search paths and URLs",
            }}
            select={{
              name: "Folder",
              label: "All folders",
              options: options(rows, (c) => evidenceFolder(c.path)),
              value: folder ?? "",
              onChange: (v) => onSearch({ folder: v }),
              test: (c, v) => evidenceFolder(c.path) === v,
            }}
            selects={[
              {
                name: "Tool",
                label: "All tools",
                options: options(rows, (c) => c.tool),
                value: tool ?? "",
                onChange: (v) => onSearch({ tool: v }),
                test: (c, v) => c.tool === v,
              },
            ]}
            empty="This record has no capture ledger loaded."
            layout="stack"
          />
        )}
      </QueryResult>
    </>
  );
}

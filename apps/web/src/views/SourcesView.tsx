import { useQuery } from "@tanstack/react-query";
import type { SourceSiteFilter } from "../api/queries";
import { recordsQuery, sourcesQuery } from "../api/queries";
import type { Source } from "../api/types";
import { CLASS_LABELS } from "../app/classes";
import { CaptureStamp } from "../components/CaptureStamp";
import { Clamp } from "../components/Clamp";
import type { Column } from "../components/DataTable";
import { DataTable } from "../components/DataTable";
import { QueryResult } from "../components/QueryResult";
import { ViewHeader } from "../components/ViewHeader";
import { optionalKey, optionalText } from "../lib/search";
import { recordLabel, sourceLabel } from "../lib/sources";

/** Select label per site; the keys are every site `?site=` accepts. */
const SITE_LABELS: Record<SourceSiteFilter, string> = { web: "Web", yt: "YouTube" };

/** The highest relevance a source is given. */
const MAX_RELEVANCE = 3;

/** The sources view's search params: a site and a record to narrow to, and a title search. */
export interface SourcesSearch {
  site?: SourceSiteFilter;
  record?: string;
  q?: string;
}

/**
 * Reads the sources view's search params.
 *
 * @param search - the router's decoded query values
 * @returns the site, record and title search, each dropped when unusable
 */
export function validateSourcesSearch(search: Record<string, unknown>): SourcesSearch {
  return {
    site: optionalKey(search.site, SITE_LABELS),
    record: optionalText(search.record),
    q: optionalText(search.q),
  };
}

/**
 * Orders sources newest first, undated last, then by id.
 *
 * @param a - a source
 * @param b - another source
 * @returns negative, zero or positive, as for `Array.prototype.sort`
 */
function newestFirst(a: Source, b: Source): number {
  if (a.date !== b.date) {
    if (a.date == null) return 1;
    if (b.date == null) return -1;
    return b.date.localeCompare(a.date);
  }
  return a.id.localeCompare(b.id);
}

/**
 * A source's relevance as a row of dots, filled up to its score, with the
 * score in words for assistive tech and the tooltip.
 *
 * @param props - the relevance, or null when unrated
 * @returns the meter, or null when unrated
 */
function Relevance({ value }: { value: number | null }) {
  if (value == null) return null;
  const label = `Relevance ${value} of ${MAX_RELEVANCE}`;
  return (
    <span className="relevance" title={label} role="img" aria-label={label}>
      {Array.from({ length: MAX_RELEVANCE }, (_, i) => (
        <i key={i} className={i < value ? "on" : undefined} />
      ))}
    </span>
  );
}

/**
 * Builds the table's columns: the source's link, its title (English first,
 * the original beneath), date, relevance, the records citing it as quiet
 * chips, and its capture.
 *
 * @param label - names a record's slug for its chip
 * @returns the columns
 */
function columns(label: (slug: string) => string): Column<Source>[] {
  return [
    {
      header: "Source",
      cell: (s) => (
        <a className="source-link" href={s.url} target="_blank" rel="noopener" title={s.url}>
          {sourceLabel(s.id)}
        </a>
      ),
      className: "source-id",
    },
    {
      header: "Title",
      cell: (s) => {
        const main = s.titleEn ?? s.title ?? "";
        return (
          <span className="source-title-text">
            <span className="en">
              <Clamp lines={1}>{main}</Clamp>
            </span>
            {s.titleEn && s.title ? <span className="kr">{s.title}</span> : null}
          </span>
        );
      },
      className: "wide source-title",
    },
    {
      header: "Date",
      cell: (s) => s.date ?? "",
      className: "n",
    },
    {
      header: "Relevance",
      cell: (s) => <Relevance value={s.relevance} />,
      className: "source-rel",
    },
    {
      header: "Records",
      cell: (s) => (
        <span className="chips src">
          {s.records.map((r) => (
            <span key={r} className="chip" title={r}>
              {label(r)}
            </span>
          ))}
        </span>
      ),
      className: "source-records",
    },
    {
      header: "Captured",
      // The path is cut from the left, so the file name stays in view; the full path is the tooltip.
      cell: (s) => (
        <span className="source-capture-cell">
          {s.capture ? (
            <CaptureStamp
              capturedAt={s.capture.capturedAt}
              tool={s.capture.tool}
              approx={s.capture.approx}
            />
          ) : null}
          {s.capturePath ? (
            <span className="capture" title={s.capturePath}>
              <span className="mono" dir="ltr">
                {s.capturePath}
              </span>
            </span>
          ) : null}
        </span>
      ),
      className: "source-captured",
    },
  ];
}

/** Props for {@link SourcesView}. */
export interface SourcesViewProps {
  /** The current search params. */
  search: SourcesSearch;
  /** Applies a patch to the search params. */
  onSearch: (patch: SourcesSearch) => void;
}

/**
 * Every cited source, newest first, filterable by site (`?site=`), research
 * record (`?record=`) and title (`?q=`). Each row ends with the records that
 * cite it as quiet chips and its capture.
 *
 * @param props - the search params and their setter
 * @returns the sources view
 */
export function SourcesView({ search: { site, record, q }, onSearch }: SourcesViewProps) {
  const sources = useQuery(sourcesQuery({ site, record }));
  const records = useQuery(recordsQuery()).data ?? [];
  /**
   * Names a record for its chip and the record select.
   *
   * @param slug - the record's slug
   * @returns its label
   */
  const label = (slug: string) => recordLabel(slug, records, CLASS_LABELS);
  return (
    <>
      <ViewHeader
        title="Sources"
        lede={[
          "Every guide and video this logbook cites, newest first.",
          "Dots rate relevance; ≈ marks a backfilled capture time.",
        ]}
      />
      <QueryResult query={sources} resource="sources">
        {(rows) => (
          <DataTable
            columns={columns(label)}
            rows={[...rows].sort(newestFirst)}
            rowKey={(s) => s.id}
            filter={{
              value: q ?? "",
              onChange: (v) => onSearch({ q: v }),
              text: (s) => `${s.id} ${s.title ?? ""} ${s.titleEn ?? ""}`,
              placeholder: "Search titles",
            }}
            select={{
              name: "Site",
              label: "All sites",
              options: Object.entries(SITE_LABELS),
              value: site ?? "",
              onChange: (v) => onSearch({ site: optionalKey(v, SITE_LABELS) }),
            }}
            selects={[
              {
                name: "Record",
                label: "All records",
                options: records.map((r) => [r.slug, label(r.slug)] as const),
                value: record ?? "",
                onChange: (v) => onSearch({ record: optionalText(v) }),
              },
            ]}
            empty={site || record ? "No sources match these filters." : "No sources recorded yet."}
            layout="stack"
          />
        )}
      </QueryResult>
    </>
  );
}

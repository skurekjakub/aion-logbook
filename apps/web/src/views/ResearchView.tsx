import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { recordsQuery, sourcesQuery } from "../api/queries";
import type { ResearchRecord } from "../api/types";
import { CLASS_LABELS } from "../app/classes";
import { Clamp } from "../components/Clamp";
import { EmptyState } from "../components/EmptyState";
import { Pill } from "../components/Pill";
import { QueryResult } from "../components/QueryResult";
import { ViewHeader } from "../components/ViewHeader";

/**
 * One record as a compact card: its status, slug and update date on top,
 * its classes as the heading (each linking to the class's builds), the
 * lede and the research question each cut short, then its dates, source
 * count and capture ledger.
 *
 * @param props - the record, and its source count once known
 * @returns the card
 */
function RecordCard({ record, sources }: { record: ResearchRecord; sources: number | undefined }) {
  return (
    <article className="card record-card">
      <div className="record-top">
        <Pill kind={record.status === "active" ? "good" : "quiet"}>{record.status}</Pill>
        <span className="record-no mono" title={`research/${record.slug}/`}>
          {record.slug}
        </span>
        <span className="record-updated muted">
          Updated <time dateTime={record.updatedAt}>{record.updatedAt}</time>
        </span>
      </div>
      <h3 className="record-classes">
        {record.classes.length
          ? record.classes.map((cls) => (
              <Link key={cls} to="/$class" params={{ class: cls }} className="class-chip">
                {CLASS_LABELS[cls]}
              </Link>
            ))
          : record.slug}
      </h3>
      {record.lede ? (
        <div className="record-lede">
          <Clamp lines={2} perLine={60}>
            {record.lede}
          </Clamp>
        </div>
      ) : null}
      <div className="record-q muted">
        <span className="label">Question</span>
        <span>
          <Clamp lines={1}>{record.question}</Clamp>
        </span>
      </div>
      <div className="record-foot">
        <span className="chips">
          <span className="chip">Started {record.startedAt}</span>
          {record.seasonLabel ? (
            <span className="chip season" title={record.seasonLabel}>
              {record.seasonLabel}
            </span>
          ) : null}
          {sources == null ? null : <span className="chip">{sources} sources</span>}
        </span>
        <Link to="/research/$slug/captures" params={{ slug: record.slug }} className="ledger-link">
          Capture ledger
        </Link>
      </div>
    </article>
  );
}

/**
 * The research index: every research record as a compact card. "No
 * research records yet." when there are none.
 *
 * @returns the research index
 */
export function ResearchView() {
  const records = useQuery(recordsQuery());
  const counts = useQuery({
    ...sourcesQuery(),
    select: (rows) => {
      const n = new Map<string, number>();
      for (const s of rows) for (const r of s.records) n.set(r, (n.get(r) ?? 0) + 1);
      return n;
    },
  }).data;

  return (
    <>
      <ViewHeader
        title="Research records"
        lede={[
          "One investigated question per record.",
          "Each class's builds come from its record.",
        ]}
      />
      <QueryResult query={records} resource="research records">
        {(rows) =>
          rows.length ? (
            <div className="record-grid">
              {rows.map((r) => (
                <RecordCard
                  key={r.slug}
                  record={r}
                  sources={counts?.get(r.slug) ?? (counts ? 0 : undefined)}
                />
              ))}
            </div>
          ) : (
            <EmptyState>No research records yet.</EmptyState>
          )
        }
      </QueryResult>
    </>
  );
}

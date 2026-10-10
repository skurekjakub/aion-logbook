import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { startSync, syncInfoQuery } from "../api/queries";

/** How long after a dispatch the page keeps refetching, waiting for the deploy, in milliseconds. */
const WATCH_MS = 6 * 60_000;

/** How often it refetches meanwhile, in milliseconds. */
const WATCH_EVERY_MS = 30_000;

/** The outcome line under the button. */
type Outcome = Awaited<ReturnType<typeof startSync>>;

/**
 * The line that says what a press did.
 *
 * @param props - the press's outcome
 * @returns the line
 */
function OutcomeLine({ outcome }: { outcome: Outcome }) {
  switch (outcome.status) {
    case "synced":
      return <span className="sync-note good">✓ {outcome.message}</span>;
    case "dispatched":
      return (
        <span className="sync-note good">
          ✓ Started · live in ~3 min{" "}
          <a href={outcome.url} target="_blank" rel="noreferrer">
            watch
          </a>
        </span>
      );
    case "busy":
      return (
        <span className="sync-note warn">
          Already running or just ran{" "}
          <a href={outcome.url} target="_blank" rel="noreferrer">
            see run
          </a>
        </span>
      );
    case "manual":
      return (
        <span className="sync-note">
          <a href={outcome.url} target="_blank" rel="noreferrer">
            Run it on GitHub
          </a>
        </span>
      );
    case "failed":
    case "forbidden":
      return <span className="sync-note bad">✗ {outcome.message}</span>;
  }
}

/**
 * The sync button: pulls the character from the official site. Locally the
 * server runs the sync and the page refetches when it ends; on the
 * deployment it dispatches the GitHub workflow and refetches until the
 * deploy lands, or, without a token there, links to the workflow's page.
 *
 * @returns the button and what its last press did
 */
export function SyncControl() {
  const info = useQuery(syncInfoQuery());
  const client = useQueryClient();
  const press = useMutation({
    mutationFn: startSync,
    onSuccess: async (outcome) => {
      if (outcome.status === "synced") await client.invalidateQueries();
    },
  });

  const dispatched = press.data?.status === "dispatched";
  useEffect(() => {
    if (!dispatched) return;
    const every = setInterval(() => void client.invalidateQueries(), WATCH_EVERY_MS);
    const stop = setTimeout(() => clearInterval(every), WATCH_MS);
    return () => {
      clearInterval(every);
      clearTimeout(stop);
    };
  }, [dispatched, client]);

  if (!info.data) return null;
  return (
    <div className="sync-bar">
      {info.data.mode === "manual" ? (
        <a
          className="sync-btn"
          href={info.data.url}
          target="_blank"
          rel="noreferrer"
          title="Opens the sync on GitHub: press Run workflow"
        >
          ⟳ Sync character ↗
        </a>
      ) : (
        <button
          type="button"
          className="sync-btn"
          disabled={press.isPending}
          onClick={() => press.mutate()}
          title="Pull the character from the official site"
        >
          {press.isPending ? "⟳ Syncing…" : "⟳ Sync character"}
        </button>
      )}
      {press.data ? <OutcomeLine outcome={press.data} /> : null}
      {press.error ? <span className="sync-note bad">✗ {press.error.message}</span> : null}
    </div>
  );
}

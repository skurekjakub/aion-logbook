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
    case "unchanged":
      return <span className="sync-note good">✓ Already up to date</span>;
    case "live":
      return (
        <span className="sync-note good">
          ✓ Live: {outcome.message} <span className="muted">· memory only</span>{" "}
          <SaveNote save={outcome.save} />
        </span>
      );
    case "failed":
    case "forbidden":
      return <span className="sync-note bad">✗ {outcome.message}</span>;
  }
}

/**
 * What saving a live read for good did, after the live outcome.
 *
 * @param props - the saving service's outcome
 * @returns the note, or nothing when there was nothing to save
 */
function SaveNote({ save }: { save: Extract<Outcome, { status: "live" }>["save"] }) {
  switch (save.status) {
    case "dispatched":
      return (
        <a href={save.url} target="_blank" rel="noreferrer">
          · saving (~3 min)
        </a>
      );
    case "busy":
      return (
        <a href={save.url} target="_blank" rel="noreferrer">
          · save already running
        </a>
      );
    case "manual":
      return (
        <a href={save.url} target="_blank" rel="noreferrer">
          · save permanently ↗
        </a>
      );
    case "failed":
      return <span className="bad">· save failed: {save.message}</span>;
    default:
      return null;
  }
}

/**
 * The sync button: pulls the character from the official site. Locally the
 * server runs the sync and the page refetches when it ends. On the
 * deployment the server reads the character into its memory and the page
 * refetches at once; saving it for good dispatches the GitHub workflow
 * (and the page refetches until the deploy lands) or links to the
 * workflow's page. A server that can only link makes the button a link.
 *
 * @returns the button and what its last press did
 */
export function SyncControl() {
  const info = useQuery(syncInfoQuery());
  const client = useQueryClient();
  const press = useMutation({
    mutationFn: startSync,
    onSuccess: async (outcome) => {
      if (outcome.status === "synced" || outcome.status === "live") {
        await client.invalidateQueries();
      }
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

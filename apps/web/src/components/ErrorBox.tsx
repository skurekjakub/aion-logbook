import { DetailedError } from "hono/client";

/** Props for {@link ErrorBox}. */
export interface ErrorBoxProps {
  /** What failed to load, in words: "decks", "research record". */
  resource: string;
  /** The error a query or render threw. */
  error: unknown;
}

/**
 * A one-line description of an error. An API error (a `DetailedError` from
 * `parseResponse`) reads as its status plus the body's `message` (or `error`
 * code, or status text); any other `Error` reads as its message.
 *
 * @param error - anything thrown
 * @returns a short human-readable description
 */
export function describeError(error: unknown): string {
  if (error instanceof DetailedError) {
    const detail = error.detail as
      { data?: { message?: unknown; error?: unknown }; statusText?: string } | undefined;
    const data = detail?.data;
    const text =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.error === "string"
          ? data.error
          : (detail?.statusText ?? "");
    return `${String(error.statusCode ?? "")} ${text}`.trim();
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * The red error box naming the resource that failed. It replaces only the
 * failed part of a page, so sibling content keeps rendering.
 *
 * @param props - the failed resource's name and the error
 * @returns the error box
 */
export function ErrorBox({ resource, error }: ErrorBoxProps) {
  return (
    <div className="error" role="alert">
      Couldn't load {resource}: {describeError(error)}
    </div>
  );
}

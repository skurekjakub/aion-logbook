import type { CSSProperties, ReactNode } from "react";
import { useId, useLayoutEffect, useRef, useState } from "react";

/** Props for {@link Clamp}. */
export interface ClampProps {
  /** The text to clamp: a string, or inline content. */
  children: ReactNode;
  /** Lines shown while collapsed; 1 when omitted. */
  lines?: number;
  /**
   * The text's length in characters, when `children` isn't a plain string,
   * so a short text skips the toggle; without it, non-string content is
   * treated as long.
   */
  length?: number;
  /** Characters a collapsed line holds before the toggle shows; 90 when omitted. */
  perLine?: number;
}

/**
 * A long text cut to its first lines, with a "More" button that expands it
 * in place ("Less" folds it again). A text short enough to fit renders as it
 * is, with no wrapper. Whether it fits is first judged by its length, so the server-free
 * first render is stable, then measured in the browser, which drops the
 * button when the text turns out to fit on a wide screen.
 *
 * @param props - the text, the lines to show, and its length when it isn't a string
 * @returns the text, clamped when long
 */
export function Clamp({ children, lines = 1, length, perLine = 90 }: ClampProps) {
  const chars = typeof children === "string" ? children.length : length;
  const long = chars == null || chars > lines * perLine;
  const [open, setOpen] = useState(false);
  const [fits, setFits] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!long || open || !el || el.clientHeight === 0) return;
    /** Marks the text as fitting when its clamped box shows all of it. */
    const measure = () => {
      setFits(el.scrollHeight <= el.clientHeight + 1);
    };
    measure();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [long, open]);

  if (!long) return <>{children}</>;
  return (
    <span className={open ? "clamp open" : "clamp"}>
      <span
        ref={ref}
        id={id}
        className="clamp-text"
        style={open ? undefined : ({ "--clamp": lines } as CSSProperties)}
      >
        {children}
      </span>
      {fits && !open ? null : (
        <button
          type="button"
          className="more"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setOpen(!open);
          }}
        >
          {open ? "Less" : "More"}
        </button>
      )}
    </span>
  );
}

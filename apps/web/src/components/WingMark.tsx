/** The left wing's feathers, longest first, on a 32×32 grid; the right wing mirrors them. */
const FEATHERS = [
  "M14.5 18.5Q7 16 2.5 6.5Q9 12 14.5 15.5Z",
  "M14.5 20Q8 19.5 4 13.5Q10 17 14.5 18Z",
  "M14.5 21.5Q10 22.5 6.5 19.5Q11 20.5 14.5 20Z",
];

/** Props for {@link WingMark}. */
export interface WingMarkProps {
  /** Class for the `<svg>`; it fills with the current text colour. */
  className?: string;
}

/**
 * The logbook's mark: a pair of wings around a diamond, drawn in the
 * current text colour. Decorative, so it's hidden from assistive tech.
 *
 * @param props - the class for the `<svg>`
 * @returns the mark
 */
export function WingMark({ className }: WingMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width="32"
      height="32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <g>
        {FEATHERS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g transform="matrix(-1 0 0 1 32 0)">
        {FEATHERS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path d="M16 12.5L18 19L16 26L14 19Z" />
    </svg>
  );
}

import { Clamp } from "./Clamp";
import type { SkillRef } from "./SkillChip";
import { SkillChip } from "./SkillChip";

/** What a {@link MacroChain} shows of a macro chain. */
export interface MacroChainData {
  id: string;
  name: string;
  /** The key the chain is bound to. */
  key: string;
  /** The editor's delay between steps, in milliseconds. */
  delayMs: number;
  /** Why the chain is built this way: one line. */
  why: string;
  /** The steps; `position` 1 is the editor's first slot. */
  steps: ReadonlyArray<{ position: number; note: string | null; skill: SkillRef }>;
}

/** Props for {@link MacroChain}. */
export interface MacroChainProps {
  macro: MacroChainData;
}

/**
 * A built-in macro chain as the editor holds it: its name, its key and its
 * delay first, then its steps top to bottom as skill chips, each with its
 * note, then the why cut to one line.
 *
 * @param props - the chain
 * @returns the chain's card
 */
export function MacroChain({ macro }: MacroChainProps) {
  const steps = [...macro.steps].sort((a, b) => a.position - b.position);
  return (
    <article className="card macro">
      <div className="macro-head">
        <h3>{macro.name}</h3>
        <span className="macro-key" title="Bound key">
          <span className="label">Key</span>
          <kbd>{macro.key}</kbd>
        </span>
        <span className="macro-delay" title="Delay between steps">
          <span className="label">Delay</span>
          <span className="mono">{`${macro.delayMs} ms`}</span>
        </span>
      </div>
      <ol className="macro-steps" aria-label={`${macro.name} steps`}>
        {steps.map((step) => (
          <li key={step.position}>
            <span className="step-no mono" aria-hidden="true">
              {step.position}
            </span>
            <SkillChip skill={step.skill} />
            {step.note ? <span className="step-note muted">{step.note}</span> : null}
          </li>
        ))}
      </ol>
      <div className="macro-why muted">
        <Clamp lines={1}>{macro.why}</Clamp>
      </div>
    </article>
  );
}

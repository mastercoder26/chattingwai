import type { CSSProperties } from 'react';
import '@/app/ascii-motion.css';

type AsciiMotionProps = {
  className?: string;
  /** Disables decorative movement while preserving the loading status. */
  animated?: boolean;
};

const thinkingRows = ['..:|:....', '.:|||:...', '..:|:....'];

/** A tiny traveling signal. Animation runs entirely in CSS. */
export function AsciiThinking({
  className = '',
  animated = true,
  label = 'Thinking',
}: AsciiMotionProps & { label?: string }) {
  return (
    <span
      className={`ascii-thinking ${animated ? '' : 'ascii-static'} ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="ascii-signal" aria-hidden="true">
        {thinkingRows.map((row, y) => (
          <span className="ascii-row" key={y}>
            {Array.from(row).map((character, x) => (
              <span
                className="ascii-cell"
                style={{ '--ascii-delay': `${(x * 90 + y * 55) * -1}ms` } as CSSProperties}
                key={x}
              >
                {character}
              </span>
            ))}
          </span>
        ))}
      </span>
      <span className="ascii-status-label">{label}</span>
    </span>
  );
}

/** A one-second decorative signal that never intercepts input or blocks content. */
export function AsciiIntro({ className = '', animated = true }: AsciiMotionProps) {
  if (!animated) return null;

  return (
    <span className={`ascii-intro ${className}`} aria-hidden="true">
      <span className="ascii-intro-signal">
        <span>{'     . : .     '}</span>
        <span>{'  . : /|\\ : .  '}</span>
        <span>{'. : --[ ]-- : .'}</span>
        <span>{'  . : \\|/ : .  '}</span>
        <span>{'     . : .     '}</span>
      </span>
    </span>
  );
}

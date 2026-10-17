export function BrandMark({ className = '', size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      className={`brand-mark ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

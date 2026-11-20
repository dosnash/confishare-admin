export default function Logo({ compact = false }: { compact?: boolean }) {
  return <span className="brand" aria-label="ConfiShare">
    <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
    {!compact && <span className="brand-name">Confi<span>Share</span></span>}
  </span>;
}

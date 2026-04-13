interface MarginBadgeProps {
  marginPercent: number | null | undefined;
}

export function marginTier(p: number): 'hot' | 'good' | 'neutral' | 'bad' {
  if (p >= 100) return 'hot';
  if (p >= 50) return 'good';
  if (p >= 0) return 'neutral';
  return 'bad';
}

export function MarginBadge({ marginPercent }: MarginBadgeProps) {
  if (marginPercent == null) {
    return <span className="margin-badge neutral">N/A</span>;
  }
  const tier = marginTier(marginPercent);
  const sign = marginPercent >= 0 ? '+' : '';
  return (
    <span className={`margin-badge ${tier}`} title={`${marginPercent.toFixed(2)}%`}>
      {sign}
      {Math.round(marginPercent)}%
    </span>
  );
}

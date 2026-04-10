interface MarginBadgeProps {
  marginPercent: number;
}

export function MarginBadge({ marginPercent }: MarginBadgeProps) {
  let color = '#dc3545'; // red
  let label = 'Low';

  if (marginPercent >= 50) {
    color = '#28a745'; // green
    label = 'Hot';
  } else if (marginPercent >= 20) {
    color = '#ffc107'; // yellow
    label = 'OK';
  }

  return (
    <span style={{
      background: color,
      color: marginPercent >= 20 && marginPercent < 50 ? '#000' : '#fff',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 'bold',
    }}>
      {label} {marginPercent.toFixed(0)}%
    </span>
  );
}

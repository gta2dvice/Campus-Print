import { STATUS_LABELS, PAY_LABELS } from '../../lib/adminHelpers';

export default function StatusBadge({ status, kind = 'order' }) {
  const label = (kind === 'payment' ? PAY_LABELS[status] : STATUS_LABELS[status]) || status;
  const badgeClass = `admin-badge admin-badge-${status || 'completed'}`;

  return (
    <span className={badgeClass}>
      <span className="admin-badge-dot" />
      <span>{label}</span>
    </span>
  );
}

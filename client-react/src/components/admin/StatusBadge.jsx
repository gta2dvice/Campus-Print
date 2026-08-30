import { STATUS_LABELS, PAY_LABELS, STATUS_BADGE_CLASSES } from '../../lib/adminHelpers';

export default function StatusBadge({ status, kind = 'order' }) {
  const label = (kind === 'payment' ? PAY_LABELS[status] : STATUS_LABELS[status]) || status;
  const cls = STATUS_BADGE_CLASSES[status] || 'bg-gray-500/10 text-gray-600';
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[0.72rem] font-semibold tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

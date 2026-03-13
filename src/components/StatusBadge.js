import { formatStatusLabel, toStatusClass } from '../utils/appHelpers';

export default function StatusBadge({ status }) {
  const label = formatStatusLabel(status);
  return <span className={`status-badge ${toStatusClass(label)}`}>{label}</span>;
}

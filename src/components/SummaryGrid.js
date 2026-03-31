import AppIcon from './AppIcon';

export default function SummaryGrid({ items }) {
  const gridClassName = `summary-grid summary-grid-${Math.min(Math.max(items.length, 1), 4)}`;

  return (
    <div className={gridClassName}>
      {items.map((item) => (
        <article
          key={item.label}
          className={`summary-card ${item.tone ? `summary-card-${item.tone}` : ''}`}
        >
          <div className="card-stat-head">
            {item.icon && (
              <span className="card-stat-icon">
                <AppIcon name={item.icon} />
              </span>
            )}
            <span>{item.label}</span>
          </div>
          <strong>{item.value}</strong>
          <p>{item.helper}</p>
        </article>
      ))}
    </div>
  );
}

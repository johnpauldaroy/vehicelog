import AppIcon from './AppIcon';

export default function SummaryGrid({ items }) {
  return (
    <div className="summary-grid">
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

import AppIcon from './AppIcon';

function getPressureLabel(value) {
  if (value >= 80) {
    return 'High';
  }

  if (value >= 60) {
    return 'Elevated';
  }

  if (value >= 35) {
    return 'Steady';
  }

  return 'Light';
}

function clampUtilization(value) {
  const normalizedValue = Math.min(Number(value) || 0, 100);
  return normalizedValue > 0 ? Math.max(8, normalizedValue) : 0;
}

export default function BranchUtilizationBoard({ items, ariaLabel }) {
  const rankedItems = [...items].sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));

  if (!rankedItems.length) {
    return <div className="empty-state-panel">No branch utilization data is available for the current filters.</div>;
  }

  const leadBranch = rankedItems[0];
  const averageUtilization = Math.round(
    rankedItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0) / rankedItems.length
  );

  return (
    <div className="utilization-board" role="img" aria-label={ariaLabel}>
      <div className="utilization-hero">
        <div className="utilization-hero-copy">
          <span className="utilization-hero-icon">
            <AppIcon name="vehicles" />
          </span>
          <div>
            <span className="utilization-kicker">Peak branch load</span>
            <strong>{leadBranch.label}</strong>
            <p>{getPressureLabel(leadBranch.value)} capacity pressure across the selected scope.</p>
          </div>
        </div>
        <div className={`utilization-hero-value utilization-hero-value-${leadBranch.tone || 'blue'}`}>
          <span>{leadBranch.valueLabel || `${leadBranch.value}%`}</span>
          <small>Avg {averageUtilization}%</small>
        </div>
      </div>

      <div className="utilization-list">
        {rankedItems.map((item, index) => {
          const tone = item.tone || 'blue';
          const pressureLabel = getPressureLabel(item.value);

          return (
            <article key={item.label} className={`utilization-row utilization-row-${tone}`}>
              <div className="utilization-row-main">
                <div className="utilization-row-label">
                  <span className="utilization-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className={`utilization-dot utilization-dot-${tone}`} />
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.helper || 'Fleet committed'}</p>
                  </div>
                </div>

                <div className="utilization-row-metrics">
                  <span className={`utilization-badge utilization-badge-${tone}`}>
                    {item.valueLabel || `${item.value}%`}
                  </span>
                  <span className="utilization-pressure">{pressureLabel}</span>
                </div>
              </div>

              <div className="utilization-track" aria-hidden="true">
                <div
                  className={`utilization-fill utilization-fill-${tone}`}
                  style={{ width: `${clampUtilization(item.value)}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

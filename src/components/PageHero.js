import AppIcon from './AppIcon';

export default function PageHero({ heroContent }) {
  return (
    <section className="hero-card hero-card-spotlights">
      <div className="hero-side">
        {heroContent.spotlightLabel && (
          <p className="card-group-label">{heroContent.spotlightLabel}</p>
        )}
        <div className="spotlight-grid">
          {heroContent.spotlights.map((item) => (
            <article key={item.label} className="spotlight-card">
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
      </div>
    </section>
  );
}

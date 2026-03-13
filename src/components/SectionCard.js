export default function SectionCard({ title, subtitle, action, children, className = '' }) {
  const sectionClassName = className ? `section-card ${className}` : 'section-card';

  return (
    <section className={sectionClassName}>
      <div className="section-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && (
          <button type="button" className="text-button">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

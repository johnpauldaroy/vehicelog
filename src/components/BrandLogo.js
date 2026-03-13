import { useState } from 'react';

const LOGO_SRC = `${process.env.PUBLIC_URL || ''}/coop.png`;

function BrandLogoFallback({ className }) {
  return (
    <svg
      viewBox="0 0 320 220"
      role="img"
      aria-label="Vehicle Management System"
      className={className}
    >
      <circle cx="116" cy="110" r="92" fill="none" stroke="var(--brand-blue)" strokeWidth="8" />
      <text
        x="62"
        y="132"
        fill="var(--brand-orange)"
        fontFamily="Plus Jakarta Sans, Manrope, sans-serif"
        fontSize="82"
        fontWeight="800"
        letterSpacing="-4"
      >
        co
      </text>
      <text
        x="156"
        y="132"
        fill="var(--brand-blue-deep)"
        fontFamily="Plus Jakarta Sans, Manrope, sans-serif"
        fontSize="94"
        fontWeight="800"
        letterSpacing="-5"
      >
        op
      </text>
      <path
        d="M202 56c18-18 40-26 76-24-7 10-11 18-14 26 16 1 28-1 42-6-10 17-18 24-31 30 14 1 26-1 40-6-10 16-21 25-40 31-25 8-49 5-74-8 1-15 0-28 1-43Z"
        fill="var(--brand-yellow)"
      />
      <path
        d="M200 48c17-16 39-23 74-22-7 9-11 16-13 23 15 1 27-1 40-5-9 14-17 21-29 27 13 1 24-1 37-5-9 14-20 22-37 27-24 8-47 6-71-6 0-13-1-25-1-39Z"
        fill="var(--brand-red)"
      />
      <path
        d="M196 40c16-15 36-22 69-21-6 8-10 15-12 20 14 1 25 0 37-4-8 12-15 18-26 23 12 1 22 0 34-4-8 12-18 18-33 23-21 6-42 5-64-5-1-11-3-21-5-32Z"
        fill="var(--brand-blue-deep)"
      />
    </svg>
  );
}

export default function BrandLogo({ className = '' }) {
  const [hasError, setHasError] = useState(false);
  const logoClassName = className ? `brand-logo ${className}` : 'brand-logo';

  if (hasError) {
    return <BrandLogoFallback className={logoClassName} />;
  }

  return (
    <img
      src={LOGO_SRC}
      alt="Vehicle Management System"
      className={logoClassName}
      onError={() => setHasError(true)}
    />
  );
}

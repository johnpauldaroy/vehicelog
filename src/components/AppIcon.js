export default function AppIcon({ name, className = '' }) {
  const iconClassName = className ? `app-icon ${className}` : 'app-icon';

  switch (name) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M4 5.5h7v5H4zM13 5.5h7v8h-7zM4 12.5h7V20H4zM13 15h7v5h-7z" />
        </svg>
      );
    case 'requests':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M8 4.5h8M8 2.5v4M16 2.5v4M6 6.5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" />
          <path d="M8 11h8M8 15h5" />
        </svg>
      );
    case 'trips':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M5 18h4l2.5-8h4L18 18h1" />
          <path d="M4 18h16M7.5 10l2-4h5l2 4" />
          <circle cx="7" cy="18" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="17" cy="18" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'vehicles':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M5 16l1.6-5a2 2 0 0 1 1.92-1.4h7a2 2 0 0 1 1.91 1.4L19 16" />
          <path d="M4 16h16v3a1 1 0 0 1-1 1h-1v-2H6v2H5a1 1 0 0 1-1-1z" />
          <circle cx="7.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'compliance':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M12 3l7 3v5c0 4.5-2.7 7.8-7 10-4.3-2.2-7-5.5-7-10V6l7-3Z" />
          <path d="m9.5 12 1.7 1.7L14.8 10" />
        </svg>
      );
    case 'alerts':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'user':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case 'logout':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M9 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h3" />
          <path d="M13 8.5 17 12l-4 3.5M9 12h8" />
        </svg>
      );
    case 'menu':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'email':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5z" />
          <path d="m5 7 7 5 7-5" />
        </svg>
      );
    case 'lock':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V8a4 4 0 1 1 8 0v2" />
        </svg>
      );
    case 'eye':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      );
    case 'eye-off':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6.1 0 9.5 6 9.5 6a17.5 17.5 0 0 1-3.7 4.5" />
          <path d="M6.2 6.2A17.7 17.7 0 0 0 2.5 12s3.4 6 9.5 6a10.8 10.8 0 0 0 2-.2" />
          <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12 2.3 2.3 4.7-4.8" />
        </svg>
      );
    case 'warning':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M12 4.5 20 19H4z" />
          <path d="M12 9v4" />
          <circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M8 3.5v4M16 3.5v4M5.5 7h13A1.5 1.5 0 0 1 20 8.5v10A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7Z" />
          <path d="M4 10h16" />
        </svg>
      );
    case 'people':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <circle cx="9" cy="9" r="3" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M4.5 18a4.5 4.5 0 0 1 9 0M14 18a3.5 3.5 0 0 1 6 0" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <circle cx="11" cy="11" r="5.5" />
          <path d="m16 16 3.5 3.5" />
        </svg>
      );
    case 'release':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M7 17 17 7" />
          <path d="M9 7h8v8" />
          <path d="M5 12v6a1 1 0 0 0 1 1h6" />
        </svg>
      );
    case 'return':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M17 17 7 7" />
          <path d="M15 7H7v8" />
          <path d="M19 12v6a1 1 0 0 1-1 1h-6" />
        </svg>
      );
    case 'filter':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
      );
    case 'wrench':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M14.5 6.5a4 4 0 0 0-5 5L4.8 16.2a1.4 1.4 0 1 0 2 2l4.7-4.7a4 4 0 0 0 5-5l-2.4 2.4-2-2Z" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M12 3.75 13.6 6.2l2.86.4-.9 2.74 1.8 2.24-2.39 1.62.13 2.9-2.8-.65-2.8.65.13-2.9-2.39-1.62 1.8-2.24-.9-2.74 2.86-.4L12 3.75Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case 'trash':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="M4.5 7.5h15" />
          <path d="M9.5 4.5h5" />
          <path d="M6.5 7.5l.8 11a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-11" />
          <path d="M10 10.5v6M14 10.5v6" />
        </svg>
      );
    case 'close':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    default:
      return null;
  }
}

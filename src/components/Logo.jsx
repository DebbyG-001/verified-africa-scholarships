export default function Logo({ light }) {
  return (
    <span className={`logo ${light ? 'light' : ''}`}>
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill={light ? '#F6F4EF' : '#17332B'} />
        <circle cx="32" cy="40" r="14" fill="#E07A3F" />
        <rect x="8" y="40" width="48" height="16" fill={light ? '#F6F4EF' : '#17332B'} />
        <rect x="13" y="41" width="38" height="3" rx="1.5" fill={light ? '#17332B' : '#F6F4EF'} />
      </svg>
      <span className="logo-word">Horizon</span>
    </span>
  );
}

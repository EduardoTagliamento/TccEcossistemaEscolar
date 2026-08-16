// Glifos Feather-style extraídos literalmente de components/core/Icon.jsx
// (Bauá Design System, mcp claude-design, project
// 689c269f-be3b-4445-98c6-69b779c38839) — mesmo padrão usado em
// frontend/app/dashboard/[escolaGUID]/_components/DashboardNavbar.tsx e
// frontend/app/dashboard/[escolaGUID]/chat/icons.tsx. 24x24, stroke 2,
// round caps. Subconjunto usado na tela de Calendário.
export type IconName =
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'plus'
  | 'x'
  | 'check'
  | 'edit'
  | 'trash'
  | 'calendar'
  | 'clock'
  | 'alert-triangle'
  | 'check-square'
  | 'award'
  | 'message-circle'
  | 'external-link';

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const common: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
  };

  switch (name) {
    case 'chevron-left':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common} aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common} aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'alert-triangle':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'check-square':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'award':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    case 'message-circle':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case 'external-link':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );
    default:
      return null;
  }
}

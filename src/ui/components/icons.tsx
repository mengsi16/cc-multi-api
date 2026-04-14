import type { ReactNode, SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export type IconComponent = (props: IconProps) => JSX.Element;

function BaseIcon({ size = 16, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const Activity: IconComponent = props => (
  <BaseIcon {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </BaseIcon>
);

export const FlaskConical: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M10 2v4l-5 8a4 4 0 0 0 3.4 6h7.2a4 4 0 0 0 3.4-6l-5-8V2" />
    <path d="M8 11h8" />
  </BaseIcon>
);

export const LayoutDashboard: IconComponent = props => (
  <BaseIcon {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="11" width="7" height="10" rx="1.5" />
    <rect x="3" y="13" width="7" height="8" rx="1.5" />
  </BaseIcon>
);

export const Route: IconComponent = props => (
  <BaseIcon {...props}>
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M8 6h7a3 3 0 0 1 3 3v7" />
  </BaseIcon>
);

export const ScrollText: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M8 4h8a3 3 0 0 1 3 3v13H8a3 3 0 0 1 0-6h11" />
    <path d="M12 8h3" />
    <path d="M12 12h3" />
  </BaseIcon>
);

export const Server: IconComponent = props => (
  <BaseIcon {...props}>
    <rect x="3" y="3" width="18" height="7" rx="2" />
    <rect x="3" y="14" width="18" height="7" rx="2" />
    <path d="M7 7h.01" />
    <path d="M7 18h.01" />
  </BaseIcon>
);

export const CheckCircle2: IconComponent = props => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.2 2.2 4.8-4.8" />
  </BaseIcon>
);

export const Clock3: IconComponent = props => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5h4" />
  </BaseIcon>
);

export const Cpu: IconComponent = props => (
  <BaseIcon {...props}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M11 3v4M13 3v4M11 17v4M13 17v4M3 11h4M3 13h4M17 11h4M17 13h4" />
  </BaseIcon>
);

export const XCircle: IconComponent = props => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6" />
    <path d="m15 9-6 6" />
  </BaseIcon>
);

export const PencilLine: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
    <path d="M12 20h9" />
  </BaseIcon>
);

export const Plus: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </BaseIcon>
);

export const Trash2: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M8 10v8M12 10v8M16 10v8" />
    <path d="M6 6l1 14h10l1-14" />
  </BaseIcon>
);

export const X: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </BaseIcon>
);

export const ArrowRight: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </BaseIcon>
);

export const CircleSlash: IconComponent = props => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m7 7 10 10" />
  </BaseIcon>
);

export const PlugZap: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M6 3v6" />
    <path d="M10 3v6" />
    <path d="M8 9v6a4 4 0 0 0 4 4" />
    <path d="m16 12-2 3h3l-2 4" />
  </BaseIcon>
);

export const RotateCw: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v7h-7" />
  </BaseIcon>
);

export const Signal: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M5 20h2v-3H5v3Z" />
    <path d="M10 20h2v-6h-2v6Z" />
    <path d="M15 20h2v-9h-2v9Z" />
    <path d="M20 20h2V8h-2v12Z" />
  </BaseIcon>
);

export const ShieldAlert: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M12 3 5 6v5c0 4 2.6 7.7 7 10 4.4-2.3 7-6 7-10V6l-7-3Z" />
    <path d="M12 8v5" />
    <path d="M12 16h.01" />
  </BaseIcon>
);

export const Timer: IconComponent = props => (
  <BaseIcon {...props}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 13 9 10" />
    <path d="M9 3h6" />
  </BaseIcon>
);

export const LoaderCircle: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M21 12a9 9 0 1 1-9-9" />
  </BaseIcon>
);

export const Play: IconComponent = props => (
  <BaseIcon {...props}>
    <polygon points="8 5 19 12 8 19 8 5" />
  </BaseIcon>
);

export const Moon: IconComponent = props => (
  <BaseIcon {...props}>
    <path d="M12 3a8 8 0 1 0 9 9 7 7 0 1 1-9-9Z" />
  </BaseIcon>
);

export const Sun: IconComponent = props => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </BaseIcon>
);

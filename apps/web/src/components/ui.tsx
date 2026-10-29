import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

export type IconName =
  | "arena"
  | "sliders"
  | "connect"
  | "screen"
  | "arrow"
  | "external"
  | "copy"
  | "check"
  | "clock"
  | "chat"
  | "chevron"
  | "reset";
const paths: Record<IconName, ReactNode> = {
  arena: (
    <>
      <path d="M3 7h14v9H3zM6 4v3m8-3v3M7 11h6M10 9v4" />
    </>
  ),
  sliders: (
    <>
      <path d="M3 5h14M3 10h14M3 15h14" />
      <path d="M7 3v4m6 1v4m-6 1v4" strokeWidth="3" />
    </>
  ),
  connect: (
    <>
      <path
        d="m8 12 4-4m-5 6-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m0 8a3.5 3.5 0 0 0 5 0l4-4a3.5 3.5 0 0 0-5-5l-1 1"
        transform="translate(1 0) scale(.9)"
      />
    </>
  ),
  screen: (
    <>
      <rect x="2.5" y="3.5" width="15" height="10" rx="1.5" />
      <path d="M7 17h6m-3-3v3" />
    </>
  ),
  arrow: <path d="M3 10h13m-5-5 5 5-5 5" />,
  external: (
    <>
      <path d="M11 3h6v6m0-6-8 8M8 4H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4" />
    </>
  ),
  copy: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <path d="M12 7V3H3v9h4" />
    </>
  ),
  check: <path d="m4 10 4 4 8-8" />,
  clock: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l3 2" />
    </>
  ),
  chat: <path d="M3 3h14v11H8l-5 3V3Zm4 4h6M7 10h4" />,
  chevron: <path d="m7 5 5 5-5 5" />,
  reset: (
    <>
      <path d="M4 7a7 7 0 1 1-1 6M3 3v5h5" />
    </>
  ),
};
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`icon ${className}`}
    >
      {paths[name]}
    </svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${compact ? "brand-compact" : ""}`}
      aria-label="Chat Tug Arena home"
    >
      <svg
        viewBox="0 0 44 44"
        className="brand-mark"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      >
        <path d="M23 15c-5-8-16-4-14 4 2 7 12 7 17 1l6-7M21 29c5 8 16 4 14-4-2-7-12-7-17-1l-6 7" />
        <path d="m3 23 8-1m22 0 8-1" />
      </svg>
      <span>
        CHAT TUG<span>ARENA</span>
      </span>
    </Link>
  );
}
type Variant = "primary" | "secondary" | "quiet" | "coral" | "mint";
export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </Link>
  );
}
export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning" | "success" | "demo" | "error";
}) {
  return (
    <span className={`status status-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

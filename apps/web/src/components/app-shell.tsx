"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Brand, Icon, type IconName } from "./ui";
import { ConnectionBadge } from "./connection";
import { useConnection } from "@/lib/connection-store";
const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Control room", icon: "arena" },
  { href: "/dashboard/round", label: "Showdown setup", icon: "sliders" },
  {
    href: "/dashboard/connection",
    label: "Twitch connection",
    icon: "connect",
  },
  { href: "/dashboard/overlay", label: "OBS overlay", icon: "screen" },
  { href: "/dashboard/history", label: "Round history", icon: "clock" },
  { href: "/dashboard/mechanics", label: "Mechanics lab", icon: "arena" },
];
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationToggle = useRef<HTMLButtonElement>(null);
  const { snapshot } = useConnection();
  const current = navigation.find((item) => item.href === path);
  return (
    <div className="app-shell">
      <aside className="sidebar" data-menu-open={navigationOpen} onKeyDown={event => { if (event.key === 'Escape' && navigationOpen) { setNavigationOpen(false); navigationToggle.current?.focus(); } }}>
        <Brand compact />
        <button ref={navigationToggle} className="mobile-nav-toggle" type="button" aria-expanded={navigationOpen} aria-controls="streamer-navigation" aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setNavigationOpen(value => !value)}>Menu<Icon name="chevron" /></button>
        <div className="sidebar-workspace">
          <span className="workspace-avatar">{snapshot?.channel?.displayName.slice(0, 1) ?? "Y"}</span>
          <div>
            <strong>{snapshot?.channel?.displayName ?? "Your arena"}</strong>
            <span>{snapshot?.mode === "simulation" ? "Local simulation" : snapshot?.channel ? `@${snapshot.channel.login}` : "Streamer workspace"}</span>
          </div>
        </div>
        <nav id="streamer-navigation" aria-label="Streamer navigation">
          {navigation.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className={`nav-link ${path === item.href ? "is-active" : ""}`}
              aria-current={path === item.href ? "page" : undefined}
              onClick={() => setNavigationOpen(false)}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="status-dot" />
            Connection workspace<p>Check chat inputs before your first showdown.</p>
          </div>
          <Link href="/" className="back-to-site">
            Back to the arena site
            <Icon name="external" />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-topbar">
          <span className="breadcrumb">
            <span className="breadcrumb-root">Your arena</span>
            <Icon name="chevron" />
            <strong>{current?.label ?? "Control room"}</strong>
          </span>
          <ConnectionBadge />
        </header>
        <main id="main-content" className="workspace-content">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>Session workspace</span>
          <span>Chat Tug Arena</span>
        </footer>
      </div>
    </div>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

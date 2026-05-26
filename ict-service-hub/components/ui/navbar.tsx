// components/ui/navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = "requester" | "ict_staff" | "ict_admin" | "super_admin";

interface NavbarProps {
  profile: {
    full_name: string;
    role: UserRole;
  };
  unreadCount?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_ROLES: UserRole[] = ["ict_staff", "ict_admin", "super_admin"];

const REQUESTER_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/tickets/new", label: "New Request", icon: "➕" },
  { href: "/tickets", label: "My Tickets", icon: "📋" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: "🏠" },
  { href: "/admin/tickets", label: "Tickets", icon: "📋" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/audit", label: "Audit Logs", icon: "📜" },
  { href: "/admin/spam", label: "Spam", icon: "ℹ️" },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  // Admin navbar
  adminHeader:      "bg-slate-900 border-b border-slate-800 sticky top-0 z-30",
  adminInner:       "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  adminRow:         "flex items-center justify-between h-16",
  adminBrandLabel:  "text-xs text-amber-400 font-bold tracking-widest uppercase",
  adminBrandTitle:  "text-white font-bold text-lg leading-none",
  adminBadge:       "hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 text-xs font-bold border border-amber-600/30",
  adminNav:         "hidden md:flex items-center gap-1",
  adminLinkBase:    "px-3 py-2 rounded text-sm font-medium transition-colors",
  adminLinkActive:  "bg-white/10 text-white",
  adminLinkDefault: "text-slate-300 hover:text-white hover:bg-white/5",
  adminDivider:     "ml-4 pl-4 border-l border-white/10 flex items-center gap-2",
  adminUsername:    "text-slate-300 text-sm hidden md:block",
  adminSignOut:     "text-slate-400 hover:text-white text-sm transition-colors",

  // Admin sidebar
  adminSidebarLink:        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
  adminSidebarLinkActive:  "bg-white/10 text-white",
  adminSidebarLinkDefault: "text-slate-300 hover:text-white hover:bg-white/5",

  // Requester navbar
  requesterHeader:      "bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm",
  requesterInner:       "max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between",
  requesterAvatar:      "h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-amber-400 font-bold text-sm",
  requesterBrandLabel:  "text-xs text-amber-600 font-bold tracking-wide",
  requesterBrandTitle:  "text-slate-900 font-bold text-sm leading-none",
  requesterNav:         "hidden md:flex items-center gap-1",
  requesterLinkBase:    "px-3 py-2 text-sm rounded transition-colors",
  requesterLinkActive:  "font-semibold text-slate-900 bg-slate-100",
  requesterLinkDefault: "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100",
  requesterBellBase:    "h-10 w-10 flex items-center justify-center rounded-full transition-colors",
  requesterBellActive:  "bg-slate-100",
  requesterBellDefault: "hover:bg-slate-100",
  requesterBadge:       "absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold",
  requesterSignOut:     "ml-2 text-sm text-slate-400 hover:text-slate-600 transition-colors",

  // Requester sidebar
  requesterSidebarLink:        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
  requesterSidebarLinkActive:  "font-semibold text-slate-900 bg-slate-100",
  requesterSidebarLinkDefault: "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50",

  // Shared hamburger / sidebar
  hamburgerAdmin:     "md:hidden flex items-center justify-center h-10 w-10 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors",
  hamburgerRequester: "md:hidden flex items-center justify-center h-10 w-10 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors",
  overlay:            "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300",
  sidebarAdmin:       "fixed top-0 right-0 h-full w-72 z-50 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden",
  sidebarRequester:   "fixed top-0 right-0 h-full w-72 z-50 bg-white border-l border-slate-200 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden",
} as const;

// ─── Hamburger Icon ───────────────────────────────────────────────────────────

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="flex flex-col justify-center items-center w-5 h-5 gap-1.5">
      <span className={`block h-0.5 w-5 rounded-full transition-all duration-300 bg-current ${open ? "rotate-45 translate-y-2" : ""}`} />
      <span className={`block h-0.5 w-5 rounded-full transition-all duration-300 bg-current ${open ? "opacity-0" : ""}`} />
      <span className={`block h-0.5 w-5 rounded-full transition-all duration-300 bg-current ${open ? "-rotate-45 -translate-y-2" : ""}`} />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Navbar({ profile, unreadCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const isAdmin = ADMIN_ROLES.includes(profile.role);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Lock body scroll while sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const isActive = (href: string): boolean => {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/tickets/new") return pathname === "/tickets/new";
    if (href === "/tickets")
      return pathname === "/tickets" ||
        (pathname.startsWith("/tickets/") && pathname !== "/tickets/new");
    return pathname === href || pathname.startsWith(href + "/");
  };

  // if admin, display admin navbar
  if (isAdmin) {
    return (
      <>
        <header className={styles.adminHeader}>
          <div className={styles.adminInner}>
            <div className={styles.adminRow}>

              {/* Brand */}
              <div className="flex items-center gap-4">
                <div>
                  <div className={styles.adminBrandLabel}>Diocese of Kalookan</div>
                  <div className={styles.adminBrandTitle}>ICT Service Hub</div>
                </div>
                <span className={styles.adminBadge}>Admin Portal</span>
              </div>

              {/* Desktop nav */}
              <nav className={styles.adminNav}>
                {ADMIN_NAV.map(({ href, label }) => {
                  const active = isActive(href);
                  return (
                    <Link key={href} href={href} aria-current={active ? "page" : undefined}
                      className={`${styles.adminLinkBase} ${active ? styles.adminLinkActive : styles.adminLinkDefault}`}>
                      {label}
                    </Link>
                  );
                })}
                <div className={styles.adminDivider}>
                  <span className={styles.adminUsername}>{profile.full_name}</span>
                  <Link href="/api/auth/signout" className={styles.adminSignOut}>Sign Out</Link>
                </div>
              </nav>

              {/* Hamburger */}
              <button onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle menu"
                className={styles.hamburgerAdmin}>
                <HamburgerIcon open={sidebarOpen} />
              </button>

            </div>
          </div>
        </header>

        {/* Overlay */}
        <div onClick={() => setSidebarOpen(false)}
          className={`${styles.overlay} ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        />

        {/* Sidebar */}
        <aside className={`${styles.sidebarAdmin} ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <div className="text-xs text-amber-400 font-bold tracking-widest uppercase">Diocese of Kalookan</div>
              <div className="text-white font-bold text-base leading-none mt-0.5">ICT Service Hub</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} aria-label="Close menu"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              ✕
            </button>
          </div>

          <div className="px-5 py-4 border-b border-slate-800">
            <p className="text-sm font-semibold text-white">{profile.full_name}</p>
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 text-xs font-bold border border-amber-600/30">
              Admin Portal
            </span>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {ADMIN_NAV.map(({ href, label, icon }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined}
                  className={`${styles.adminSidebarLink} ${active ? styles.adminSidebarLinkActive : styles.adminSidebarLinkDefault}`}>
                  <span className="text-base">{icon}</span>
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="px-5 py-4 border-t border-slate-800">
            <Link href="/api/auth/signout"
              className="flex items-center gap-3 text-slate-400 hover:text-white text-sm font-medium transition-colors">
              <span>🚪</span> Sign Out
            </Link>
          </div>
        </aside>
      </>
    );
  }

  // else, display requester navbar
  return (
    <>
      <header className={styles.requesterHeader}>
        <div className={styles.requesterInner}>

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className={styles.requesterAvatar}>
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className={styles.requesterBrandLabel}>Diocese of Kalookan</div>
              <div className={styles.requesterBrandTitle}>ICT Service Hub</div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className={styles.requesterNav}>
            {REQUESTER_NAV.filter((l) => l.href !== "/notifications").map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined}
                  className={`${styles.requesterLinkBase} ${active ? styles.requesterLinkActive : styles.requesterLinkDefault}`}>
                  {label}
                </Link>
              );
            })}

            {/* Notifications bell */}
            <div className="relative ml-2">
              <Link href="/notifications" aria-label="Notifications"
                aria-current={isActive("/notifications") ? "page" : undefined}
                className={`${styles.requesterBellBase} ${isActive("/notifications") ? styles.requesterBellActive : styles.requesterBellDefault}`}>
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className={styles.requesterBadge}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </div>

            <Link href="/api/auth/signout" className={styles.requesterSignOut}>Sign Out</Link>
          </nav>

          {/* Mobile: bell + hamburger */}
          <div className="flex items-center gap-1 md:hidden">
            <div className="relative">
              <Link href="/notifications" aria-label="Notifications"
                className={`${styles.requesterBellBase} ${isActive("/notifications") ? styles.requesterBellActive : styles.requesterBellDefault}`}>
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className={styles.requesterBadge}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </div>
            <button onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle menu"
              className={styles.hamburgerRequester}>
              <HamburgerIcon open={sidebarOpen} />
            </button>
          </div>

        </div>
      </header>

      {/* Overlay */}
      <div onClick={() => setSidebarOpen(false)}
        className={`${styles.overlay} ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebarRequester} ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={styles.requesterAvatar}>
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-amber-600 font-bold tracking-wide">Diocese of Kalookan</div>
              <div className="text-slate-900 font-bold text-sm leading-none">ICT Service Hub</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close menu"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">{profile.full_name}</p>
          <p className="text-xs text-slate-400 mt-0.5">Service Requester</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {REQUESTER_NAV.map(({ href, label, icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={`${styles.requesterSidebarLink} ${active ? styles.requesterSidebarLinkActive : styles.requesterSidebarLinkDefault}`}>
                <span className="text-base">{icon}</span>
                {label}
                {href === "/notifications" && unreadCount > 0 && (
                  <span className="ml-auto h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-slate-100">
          <Link href="/api/auth/signout"
            className="flex items-center gap-3 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors">
            <span>🚪</span> Sign Out
          </Link>
        </div>
      </aside>
    </>
  );
}
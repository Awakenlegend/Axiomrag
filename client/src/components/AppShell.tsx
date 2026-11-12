import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, BarChart3, Bell, FileText, Info, LayoutDashboard, Moon, Network, Search, Settings, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/workspace", label: "Ask Documents", icon: Network },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Documents", icon: FileText },
  { href: "/query", label: "RAG Query", icon: Search },
  { href: "/verification", label: "Verification", icon: ShieldCheck },
  { href: "/evaluation", label: "Evaluation", icon: BarChart3 },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="logo-mark landing-logo-mark"><svg viewBox="0 0 23 17" aria-hidden="true"><path d="M8.15 .9H4.55L.5 9.3h3.6zM17 0h-3.6L6.15 16.4h3.6zM22.9 0h-3.6L15 7.6h3.6zM22.6 6.9H19l-4.95 9.5h3.6z" /></svg></div>
      {!compact && <div><div className="brand-name">AxiomRAG</div><span className="brand-sub">self-correcting intelligence</span></div>}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  return (
    <div className="dashboard-shell console-shell">
      <video className="shell-art" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/130837c4-0244-4f37-9c61-8d801d93fd29.jpg" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4" />
      <div className="shell-veil" />
      <aside className="sidebar">
        <Link href="/"><Logo /></Link>
        <div className="nav-label">Workspace</div>
        <nav className="nav-list">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} title={label} aria-label={label} className={`nav-item ${location === href ? "active" : ""}`}><Icon size={17} /><span>{label}</span></Link>
          ))}
        </nav>
        <div className="nav-label" style={{ marginTop: 30 }}>System</div>
        <nav className="nav-list">
          <Link href="/settings" className={`nav-item ${location === "/settings" ? "active" : ""}`}><Settings size={17} /><span>Settings</span></Link>
          <Link href="/about" className={`nav-item ${location === "/about" ? "active" : ""}`}><Info size={17} /><span>About</span></Link>
        </nav>
        <div className="sidebar-footer">
          <div className="tiny muted">DOCUMENT WORKSPACE</div>
          <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.7 }}>Upload PDF or TXT files to build a searchable evidence corpus.</div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="eyebrow">AxiomRAG / Research workspace</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="icon-btn" aria-label="notifications" onClick={() => notify("No new notifications") }><Bell size={17} /></button>
            <button className="icon-btn" aria-label="theme" onClick={() => notify("Dark research theme is active") }><Moon size={16} /></button>
            <Link className="shell-home-pill" href="/">AxiomRAG home <ArrowRight size={13} /></Link>
          </div>
        </header>
        {children}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

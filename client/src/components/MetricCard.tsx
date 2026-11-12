import type { LucideIcon } from "lucide-react";

export function Stat({ label, value, change, icon: Icon }: { label: string; value: string; change: string; icon: LucideIcon }) {
  return <div className="card stat-card"><div className="stat-top"><span>{label}</span><Icon size={16} color="#75b7ff" /></div><div className="stat-value">{value}</div><div className="stat-change">{change}</div></div>;
}

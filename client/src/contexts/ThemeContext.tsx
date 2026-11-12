import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode; defaultTheme?: string }) {
  return <>{children}</>;
}

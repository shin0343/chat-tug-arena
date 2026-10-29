import { AppShell } from "@/components/app-shell";
import { ConnectionProvider } from "@/lib/connection-store";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConnectionProvider><AppShell>{children}</AppShell></ConnectionProvider>;
}

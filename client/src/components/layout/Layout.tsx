import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#050608] text-slate-100">
      <AppSidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gradient-to-br from-[#050608] via-[#070910] to-[#050608]">
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-3 border-b border-[#1f2937]/80">
          <NotificationBell />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl space-y-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

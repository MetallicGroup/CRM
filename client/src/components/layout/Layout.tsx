import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#050608] text-slate-100">
      {/* Overlay when sidebar open on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gradient-to-br from-[#050608] via-[#070910] to-[#050608]">
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-[#1f2937]/80">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 text-slate-400 hover:text-slate-100"
            onClick={() => setSidebarOpen(true)}
            aria-label="Deschide meniul"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex-1 md:flex-initial" />
          <NotificationBell />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl w-full space-y-6 md:space-y-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

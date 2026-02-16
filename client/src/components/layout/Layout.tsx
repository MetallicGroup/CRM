import { AppSidebar } from "./AppSidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#050608] text-slate-100">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-[#050608] via-[#070910] to-[#050608]">
        <div className="mx-auto max-w-7xl space-y-8">{children}</div>
      </main>
    </div>
  );
}

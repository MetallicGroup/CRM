import { AppSidebar } from './AppSidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Angajati from "@/pages/Angajati";
import ShowroomRegional from "@/pages/ShowroomRegional";
import Distributors from "@/pages/Distributors";
import Settings from "@/pages/Settings";
import { AppSidebar } from "@/components/layout/AppSidebar";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/angajati" component={Angajati} />
        <Route path="/showroom-regional" component={ShowroomRegional} />
        <Route path="/distributors" component={Distributors} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;

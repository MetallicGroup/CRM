import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout/Layout";

import Dashboard from "@/pages/Dashboard";
import ShowroomHQ from "@/pages/ShowroomHQ";
import ShowroomRegional from "@/pages/ShowroomRegional";
import Production from "@/pages/Production";
import IndirectCosts from "@/pages/IndirectCosts";
import Agents from "@/pages/Agents";
import Distributors from "@/pages/Distributors";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/showroom-hq" component={ShowroomHQ} />
        <Route path="/showroom-regional" component={ShowroomRegional} />
        <Route path="/production" component={Production} />
        <Route path="/indirect-costs" component={IndirectCosts} />
        <Route path="/agents" component={Agents} />
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

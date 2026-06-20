import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import CRMDashboard from "@/pages/CRMDashboard";
import TaskuriProiecte from "@/pages/TaskuriProiecte";
import FinancialDashboard from "@/pages/Dashboard";
import Angajati from "@/pages/Angajati";
import AngajatClientiProfitabilitate from "@/pages/AngajatClientiProfitabilitate";
import ShowroomRegional from "@/pages/ShowroomRegional";
import Distributors from "@/pages/Distributors";
import ParteneriComisionari from "@/pages/ParteneriComisionari";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import UserManagement from "@/pages/UserManagement";
import Profitabilitate from "@/pages/Profitabilitate";
import Clienti from "@/pages/Clienti";
import Targeturi from "@/pages/Targeturi";
import Vanzari from "@/pages/Vanzari";
import Parteneri from "@/pages/Parteneri";
import Cheltuieli from "@/pages/Cheltuieli";
import CallTracking from "@/pages/CallTracking";
import Exporturi from "@/pages/Exporturi";
import UrmaririClienti from "@/pages/UrmaririClienti";
import Followup from "@/pages/Followup";
import Ofertare from "@/pages/Ofertare";
import ComingSoon from "@/pages/ComingSoon";
import Documentatie from "@/pages/Documentatie";
import Marketing from "@/pages/Marketing";
import Chat from "@/pages/Chat";
import { Layout } from "@/components/layout/Layout";

function ProtectedRoute({ 
  component: Component, 
  adminOnly = false 
}: { 
  component: React.ComponentType; 
  adminOnly?: boolean;
}) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login">
        <PublicRoute component={Login} />
      </Route>

      {/* CRM Routes */}
      <Route path="/">
        <ProtectedRoute component={CRMDashboard} />
      </Route>
      <Route path="/chat">
        <ProtectedRoute component={Chat} />
      </Route>
      <Route path="/taskuri">
        <ProtectedRoute component={TaskuriProiecte} />
      </Route>
      <Route path="/clienti">
        <ProtectedRoute component={Clienti} />
      </Route>
      <Route path="/followup">
        <ProtectedRoute component={Followup} />
      </Route>
      <Route path="/targeturi">
        <ProtectedRoute component={Targeturi} />
      </Route>
      <Route path="/vanzari">
        <ProtectedRoute component={Vanzari} />
      </Route>
      <Route path="/parteneri">
        <ProtectedRoute component={Parteneri} />
      </Route>
      <Route path="/ofertare">
        <ProtectedRoute component={Ofertare} />
      </Route>
      <Route path="/documentatie">
        <ProtectedRoute component={Documentatie} />
      </Route>
      <Route path="/marketing">
        <ProtectedRoute component={Marketing} />
      </Route>
      <Route path="/oferte">
        <ProtectedRoute component={ComingSoon} />
      </Route>
      <Route path="/cheltuieli">
        <ProtectedRoute component={Cheltuieli} adminOnly />
      </Route>

      {/* Profitabilitate - Financial Module */}
      <Route path="/profitabilitate">
        <ProtectedRoute component={Profitabilitate} adminOnly />
      </Route>
      <Route path="/profitabilitate/raport">
        <ProtectedRoute component={FinancialDashboard} adminOnly />
      </Route>
      <Route path="/profitabilitate/angajati/:agentId/clienti">
        <ProtectedRoute component={AngajatClientiProfitabilitate} adminOnly />
      </Route>
      <Route path="/profitabilitate/angajati">
        <ProtectedRoute component={Angajati} adminOnly />
      </Route>
      <Route path="/profitabilitate/showroom-uri">
        <ProtectedRoute component={ShowroomRegional} adminOnly />
      </Route>
      <Route path="/profitabilitate/distribuitori">
        <ProtectedRoute component={Distributors} adminOnly />
      </Route>
      <Route path="/profitabilitate/parteneri-comisionari">
        <ProtectedRoute component={ParteneriComisionari} adminOnly />
      </Route>
      <Route path="/profitabilitate/setari">
        <ProtectedRoute component={Settings} adminOnly />
      </Route>

      {/* Admin Routes */}
      <Route path="/utilizatori">
        <ProtectedRoute component={UserManagement} adminOnly />
      </Route>
      <Route path="/admin/apeluri">
        <ProtectedRoute component={CallTracking} adminOnly />
      </Route>
      <Route path="/admin/exporturi">
        <ProtectedRoute component={Exporturi} />
      </Route>
      <Route path="/admin/urmariri">
        <ProtectedRoute component={UrmaririClienti} adminOnly />
      </Route>

      {/* 404 */}
      <Route>
        <ProtectedRoute component={NotFound} />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

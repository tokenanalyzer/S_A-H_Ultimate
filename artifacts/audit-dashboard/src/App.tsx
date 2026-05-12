import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import RadarPage   from "@/pages/radar";
import ScannerPage from "@/pages/scanner";
import ReportsPage from "@/pages/reports";
import SavedPage   from "@/pages/saved";
import AboutPage   from "@/pages/about";
import NotFound    from "@/pages/not-found";
import AppShell    from "@/components/app-shell";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/"        component={RadarPage}   />
        <Route path="/scanner" component={ScannerPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/saved"   component={SavedPage}   />
        <Route path="/about"   component={AboutPage}   />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

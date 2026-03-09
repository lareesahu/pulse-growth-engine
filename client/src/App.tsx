import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import BrandWorkspace from "./pages/BrandWorkspace";
import IdeasBoard from "./pages/IdeasBoard";
import ContentDetail from "./pages/ContentDetail";
import PublishingCenter from "./pages/PublishingCenter";
import Analytics from "./pages/Analytics";
import Integrations from "./pages/Integrations";
import ReviewQueue from "./pages/ReviewQueue";
import InspectorSettings from "./pages/InspectorSettings";
import ForumOpportunities from "./pages/ForumOpportunities";
import ContentPackages from "./pages/ContentPackages";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/workspace" component={BrandWorkspace} />
      <Route path="/ideas" component={IdeasBoard} />
      <Route path="/content/:id" component={ContentDetail} />
      <Route path="/publishing" component={PublishingCenter} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/review" component={ReviewQueue} />
      <Route path="/inspector" component={InspectorSettings} />
      <Route path="/forums" component={ForumOpportunities} />
      <Route path="/content" component={ContentPackages} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

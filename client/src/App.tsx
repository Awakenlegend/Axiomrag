import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AboutPage from "./pages/AboutPage";
import DashboardPage from "./pages/DashboardPage";
import EvaluationPage from "./pages/EvaluationPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import QueryPage from "./pages/QueryPage";
import ResearchWorkspacePage from "./pages/ResearchWorkspacePage";
import SettingsPage from "./pages/SettingsPage";
import UploadPage from "./pages/UploadPage";
import VerificationPage from "./pages/VerificationPage";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/workspace" component={ResearchWorkspacePage} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/query" component={QueryPage} />
      <Route path="/verification" component={VerificationPage} />
      <Route path="/evaluation" component={EvaluationPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/about" component={AboutPage} />
      <Route component={DashboardPage} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

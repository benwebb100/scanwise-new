
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TranslationProvider } from "@/contexts/TranslationContext";
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateReport from "./pages/CreateReport";
import ViewReport from "./pages/ViewReport";
import Settings from "./pages/Settings";
import InsuranceVerification from "./pages/InsuranceVerification";
import BillingSuccess from "./pages/BillingSuccess";
import BillingCanceled from "./pages/BillingCanceled";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TranslationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-report" element={<CreateReport />} />
            <Route path="/report/:reportId" element={<ViewReport />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/insurance" element={<InsuranceVerification />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route path="/billing/canceled" element={<BillingCanceled />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TranslationProvider>
  </QueryClientProvider>
);

export default App;

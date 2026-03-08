import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CodeOfPoints from "./pages/CodeOfPoints";
import PdfViewer from "./pages/PdfViewer";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Routines from "./pages/Routines";
import RoutineCalculator from "./pages/RoutineCalculator";
import ApparatusConfiguration from "./pages/ApparatusConfiguration";
import ElementConfiguration from "./pages/ElementConfiguration";
import GeneralConfigurations from "./pages/GeneralConfigurations";
import SymbolManagement from "./pages/SymbolManagement";
import DynamicElementsRisk from "./pages/DynamicElementsRisk";
import StandardRisks from "./pages/StandardRisks";
import StandardRiskDetail from "./pages/StandardRiskDetail";
import CreateCustomRisk from "./pages/CreateCustomRisk";
import DynamicElementsConfiguration from "./pages/DynamicElementsConfiguration";
import LandingPageAdmin from "./pages/LandingPageAdmin";
import Events from "./pages/Events";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/code-of-points" element={<CodeOfPoints />} />
          <Route path="/viewer" element={<PdfViewer />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/apparatus-configuration" element={<ApparatusConfiguration />} />
          <Route path="/admin/element-configuration" element={<ElementConfiguration />} />
          <Route path="/admin/general-configurations" element={<GeneralConfigurations />} />
          <Route path="/admin/symbol-management" element={<SymbolManagement />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/routine-calculator" element={<RoutineCalculator />} />
          <Route path="/dynamic-elements-risk" element={<DynamicElementsRisk />} />
          <Route path="/standard-risks" element={<StandardRisks />} />
          <Route path="/standard-risk-detail" element={<StandardRiskDetail />} />
          <Route path="/create-custom-risk" element={<CreateCustomRisk />} />
          <Route path="/admin/dynamic-elements-configuration" element={<DynamicElementsConfiguration />} />
          <Route path="/admin/landing-page" element={<LandingPageAdmin />} />
          <Route path="/events" element={<Events />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

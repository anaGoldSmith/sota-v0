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
          <Route path="/auth" element={<Auth />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/routine-calculator" element={<RoutineCalculator />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

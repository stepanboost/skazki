import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FairyTaleProvider } from "@/context/FairyTaleContext";
import { AudioProvider } from "@/context/AudioContext";
import GlobalAudioPlayer from "@/components/GlobalAudioPlayer";
import Index from "./pages/Index";
import FairyTalePage from "./pages/FairyTalePage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <FairyTaleProvider>
      <AudioProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/fairy-tale/:id" element={<FairyTalePage />} />
              <Route path="/admin" element={<AdminPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <GlobalAudioPlayer />
          </BrowserRouter>
        </TooltipProvider>
      </AudioProvider>
    </FairyTaleProvider>
  </QueryClientProvider>
);

export default App;

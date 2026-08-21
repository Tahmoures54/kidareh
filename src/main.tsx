import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/700.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HelmetProvider } from "react-helmet-async";

import App from "./App";
import GlobalErrorBoundary from "./components/ui/GlobalErrorBoundary";
import "./index.css";

/* ====================== SETUP ====================== */

// RTL / Language / Theme
document.documentElement.dir = "rtl";
document.documentElement.lang = "fa-IR";
document.documentElement.setAttribute("data-theme", "light");

// React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 5,
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Global Error Logging
window.addEventListener("error", (e) => {
  console.error("Window Error:", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled Promise Rejection:", e.reason);
});

// Network Status
onlineManager.setEventListener((setOnline) => {
  const handleOnline = () => {
    setOnline(true);
    queryClient.refetchQueries({ type: "active" });
  };

  const handleOffline = () => {
    setOnline(false);
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
});

/* ====================== MOUNT ====================== */

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>

        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
);

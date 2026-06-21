import "@fontsource/vazirmatn";
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

import App from "./App";
import "./index.css";

// RTL Settings
document.documentElement.dir = "rtl";
document.documentElement.lang = "fa-IR";
document.documentElement.setAttribute("data-theme", "light");

// React Query
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

// Error logging
window.addEventListener("error", (e) => console.error("Window Error:", e.error));
window.addEventListener("unhandledrejection", (e) =>
  console.error("Unhandled Promise:", e.reason)
);

// Network status
onlineManager.setEventListener((setOnline) => {
  const handleOnline = () => {
    setOnline(true);
    queryClient.refetchQueries({ type: "active" });
  };
  const handleOffline = () => setOnline(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
});

// Render App
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>
);
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import { AppUIProvider } from "@shared/context/AppUIContext.jsx";
import { installCloudinaryFallback } from "@config/media.js";
import "./styles.css";

installCloudinaryFallback();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppUIProvider>
          <App />
        </AppUIProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

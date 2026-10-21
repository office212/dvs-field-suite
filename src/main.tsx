import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { toast } from "sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support: register the service worker in production builds only.
// A new version waits until the user taps "Update", so a job in progress is never reloaded.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        const offer = (worker: ServiceWorker) => {
          const he = document.documentElement.lang === "he";
          toast(he ? "גרסה חדשה זמינה" : "New version ready", {
            duration: Infinity,
            action: { label: he ? "עדכן" : "Update", onClick: () => worker.postMessage({ type: "SKIP_WAITING" }) },
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) offer(worker);
          });
        });
      })
      .catch(() => {
        /* the app still works online without the worker */
      });
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
  });
}

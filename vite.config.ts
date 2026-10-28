import react from "@vitejs/plugin-react";
import { mergeConfig, defineConfig } from "vitest/config";
import { defineConfig as defineViteConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default mergeConfig(
  defineViteConfig({
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg"],
        manifest: {
          name: "RoadLevel",
          short_name: "RoadLevel",
          description: "Offline-first road surveying assistant: reduced levels, peg setting-out and dipping corrections.",
          theme_color: "#0e7c66",
          background_color: "#f4f5f0",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
            { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          // Precache the app shell; IndexedDB data lives separately in the browser and is not cached here.
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
          navigateFallback: "/index.html",
        },
      }),
    ],
  }),
  defineConfig({
    test: {
      environment: "node",
    },
  }),
);

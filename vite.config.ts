/**
 * Vite Configuration - Production Optimized
 * @version 3.0.0
 * @description Optimized for Liara deployment
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode, command }) => {
  const isProd = mode === "production";
  const isServe = command === "serve";

  return {
    /* ================================================================
       Plugins
       ================================================================ */
    plugins: [
      react({
        jsxRuntime: "automatic",
        fastRefresh: isServe,
      }),

      tailwindcss(),

      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["icons/**/*.png", "robots.txt", "sitemap.xml"],

        manifest: {
          name: "کی‌داره - اجاره و فروش کالا",
          short_name: "کی‌داره",
          description: "ببین کی داره؟ اجاره و فروش کالاهای دست‌دوم با بهترین قیمت",
          theme_color: "#4f46e5",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait-primary",
          scope: "/",
          start_url: "/",

          icons: [
            {
              src: "/icons/icon-72x72.png",
              sizes: "72x72",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],

          shortcuts: [
            {
              name: "جستجو",
              short_name: "جستجو",
              description: "جستجو میان هزاران کالا",
              url: "/search",
              icons: [
                {
                  src: "/icons/shortcut-search.png",
                  sizes: "192x192",
                  type: "image/png",
                },
              ],
            },
            {
              name: "کالاهای ذخیره‌شده",
              short_name: "ذخیره‌شده",
              description: "کالاهای مورد علاقه شما",
              url: "/saved",
              icons: [
                {
                  src: "/icons/shortcut-saved.png",
                  sizes: "192x192",
                  type: "image/png",
                },
              ],
            },
            {
              name: "اضافه کردن کالا",
              short_name: "اضافه کن",
              description: "کالای خود را اضافه کنید",
              url: "/add-product",
              icons: [
                {
                  src: "/icons/shortcut-add.png",
                  sizes: "192x192",
                  type: "image/png",
                },
              ],
            },
          ],

          screenshots: [
            {
              src: "/screenshots/mobile-1.png",
              sizes: "540x720",
              type: "image/png",
              form_factor: "narrow",
            },
            {
              src: "/screenshots/mobile-2.png",
              sizes: "540x720",
              type: "image/png",
              form_factor: "narrow",
            },
          ],

          categories: ["shopping", "productivity"],
        },

        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,eot,ttf,otf,webp}"],
          globDirectory: "dist/public",
          globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js", "**.map"],

          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-stylesheets",
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-files",
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/api\.kidareh\.com\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5,
                },
              },
            },
            {
              urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: "CacheFirst",
              options: {
                cacheName: "image-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],

          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
      }),
    ],

    /* ================================================================
       Path Aliases & Resolution
       ================================================================ */
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@context": path.resolve(__dirname, "./src/context"),
        "@data": path.resolve(__dirname, "./src/data"),
        "@types": path.resolve(__dirname, "./src/types"),
        "@services": path.resolve(__dirname, "./src/services"),
      },
      dedupe: ["react", "react-dom"],
    },

    /* ================================================================
       Development Server
       ================================================================ */
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: false,
      open: false,
      cors: true,
      proxy: {
        "/api": {
          target: process.env.VITE_API_URL || "http://localhost:3000",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
          secure: false,
        },
      },
      middlewareMode: false,
      hmr: {
        protocol: "ws",
        host: "localhost",
        port: 5173,
      },
    },

    /* ================================================================
       Build Configuration
       ================================================================ */
    build: {
      target: "es2020",
      outDir: "dist/public",
      assetsDir: "assets",
      sourcemap: !isProd,
      minify: isProd ? "esbuild" : false,
      cssCodeSplit: true,
      cssMinify: isProd ? "esbuild" : false,
      chunkSizeWarningLimit: 1500,
      assetsInlineLimit: 4096,
      emptyOutDir: true,

      rollupOptions: {
        output: {
          entryFileNames: "assets/js/[name]-[hash].js",
          chunkFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: ({ name = "" }) => {
            if (/\.(png|jpe?g|svg|gif|webp|ico)$/i.test(name)) {
              return "assets/images/[name]-[hash][extname]";
            }
            if (/\.(woff|woff2|eot|ttf|otf)$/i.test(name)) {
              return "assets/fonts/[name]-[hash][extname]";
            }
            if (/\.css$/i.test(name)) {
              return "assets/css/[name]-[hash][extname]";
            }
            return "assets/[ext]/[name]-[hash][extname]";
          },
        },
      },

      reportCompressedSize: true,
    },

    /* ================================================================
       Dependency Optimization
       ================================================================ */
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "axios", "motion"],
      exclude: ["dist", "node_modules"],
    },

    /* ================================================================
       ESBuild Configuration
       ================================================================ */
    esbuild: {
      legalComments: "none",
      supported: {
        bigint: false, // ✅ اصلاح: به جای bigInt
      },
    },

    /* ================================================================
       Preview Server (for production builds)
       ================================================================ */
    preview: {
      port: 4173,
      strictPort: false,
      host: "0.0.0.0",
    },
  };
});
/**
 * Vite Configuration - Production Optimized
 * @version 2.0.0
 *
 * Bundle Optimization Strategy:
 * 1. Vendor chunks separated by category for better caching
 * 2. React ecosystem in one chunk (shared dependency)
 * 3. MUI split into core and icons (icons are tree-shaken)
 * 4. Utilities in separate chunk
 * 5. Large dependencies isolated
 *
 * Performance Improvements:
 * - Minification with terser for production
 * - Source maps disabled in production
 * - Chunk size optimized for HTTP/2
 * - Preload critical chunks
 */

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";
  const isAnalyze = mode === "analyze";

  return {
    plugins: [
      react({
        // ✅ Enable Fast Refresh in development
        fastRefresh: true,
        // Note: Console removal is handled by terser in build.terserOptions.compress.pure_funcs
      }),
      // ✅ Bundle analyzer for development insights
      isAnalyze &&
      import("rollup-plugin-visualizer").then(({ visualizer }) =>
        visualizer({
          filename: "dist/bundle-stats.html",
          open: true,
          gzipSize: true,
          brotliSize: true,
        })
      ),
    ].filter(Boolean),

    // ✅ Dependency optimization
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@mui/material",
        "axios",
        "date-fns",
        "i18next",
        "react-i18next",
        "browser-image-compression",
        "base64-js",
        "@react-pdf/renderer",
      ],
    },

    // ✅ Development server configuration
    server: {
      host: "0.0.0.0",
      port: 5176,
      strictPort: false,
      proxy: {
        // All API requests proxy to backend
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
        "/media": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // ✅ Preview server (production build testing)
    preview: {
      host: "localhost",
      port: 4173,
      strictPort: true,
    },

    // ✅ Build configuration - Production optimized
    build: {
      // Target modern browsers for smaller bundles
      target: "es2020",

      // ✅ Minification with terser for best compression
      minify: isProduction ? "terser" : "esbuild",
      terserOptions: isProduction
        ? {
          compress: {
            drop_console: false, // Keep console.error/warn
            drop_debugger: true,
            pure_funcs: ["console.log", "console.debug", "console.info"],
            passes: 2,
          },
          mangle: {
            safari10: true,
          },
          format: {
            comments: false,
          },
        }
        : undefined,

      // ✅ Disable source maps in production
      sourcemap: !isProduction,

      // ✅ Output directory
      outDir: "dist",
      assetsDir: "assets",

      // ✅ Rollup options for chunk splitting
      rollupOptions: {
        output: {
          // ✅ Strategic chunk splitting for optimal caching
          manualChunks: {
            // Core React ecosystem - rarely changes
            "vendor-react": ["react", "react-dom", "react-router-dom"],

            // MUI core - moderate changes
            "vendor-mui-core": [
              "@mui/material",
              "@emotion/react",
              "@emotion/styled",
            ],

            // MUI icons - tree-shaken, separate chunk
            "vendor-mui-icons": ["@mui/icons-material"],

            // Utilities - stable, good cache hit
            "vendor-utils": [
              "axios",
              "date-fns",
              "i18next",
              "react-i18next",
            ],

            // Heavy dependencies - isolated for better caching
            "vendor-pdf": ["@react-pdf/renderer"],

            // Markdown rendering
            "vendor-markdown": ["react-markdown"],
          },

          // ✅ Naming patterns for better caching
          chunkFileNames: (chunkInfo) => {
            // Vendor chunks get content hash for long-term caching
            if (chunkInfo.name.startsWith("vendor-")) {
              return "assets/[name]-[hash].js";
            }
            // App chunks
            return "assets/[name]-[hash].js";
          },

          // Entry file naming
          entryFileNames: "assets/[name]-[hash].js",

          // Asset naming
          assetFileNames: (assetInfo) => {
            // Images
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
              return "assets/images/[name]-[hash][extname]";
            }
            // Fonts
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return "assets/fonts/[name]-[hash][extname]";
            }
            // CSS
            if (/\.css$/i.test(assetInfo.name)) {
              return "assets/css/[name]-[hash][extname]";
            }
            // Default
            return "assets/[name]-[hash][extname]";
          },
        },
      },

      // ✅ Chunk size warning - optimized for HTTP/2
      chunkSizeWarningLimit: 500, // 500KB warning

      // ✅ CSS code splitting
      cssCodeSplit: true,

      // ✅ Report compressed sizes
      reportCompressedSize: true,
    },

    // ✅ CSS configuration
    css: {
      devSourcemap: !isProduction,
    },

    // ✅ Resolve configuration
    resolve: {
      alias: {
        // Alias for cleaner imports (optional)
        "@": "/src",
        "@components": "/src/components",
        "@features": "/src/features",
        "@hooks": "/src/hooks",
        "@services": "/src/services",
        "@utils": "/src/utils",
        "@styles": "/src/styles",
        // Buffer polyfill for jszip (and other Node.js packages used in the browser)
        buffer: "buffer/",
      },
    },

    // ✅ Define environment variables
    define: {
      __DEV__: !isProduction,
      __PROD__: isProduction,
      global: 'globalThis',
    },
  };
});

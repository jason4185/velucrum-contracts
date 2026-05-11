import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "coop-coep-headers",
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          // Required for SharedArrayBuffer used by the Zama SDK's multithreaded WASM
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          next();
        });
      },
    },
  ],
  optimizeDeps: {
    // Prevent Vite from pre-bundling the WASM-heavy relayer SDK
    exclude: ["@zama-fhe/relayer-sdk"],
  },
});

import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { mochaPlugins } from "@getmocha/vite-plugins";

export default defineConfig({
  plugins: [
    // mochaPlugins handles the internal logic for your template
    ...mochaPlugins(process.env as any),
    react(),
    cloudflare(), // Removed the missing emails-service auxiliary worker
  ],
  server: {
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 5000,
    // Ensure the build output matches what Vercel/Cloudflare expects
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

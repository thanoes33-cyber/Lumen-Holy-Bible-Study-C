import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3000,
    },
    // Polyfill process.env for browser compatibility
    define: {
      'process.env': {
        // Map necessary keys safely
        API_KEY: JSON.stringify(env.VITE_API_KEY || env.API_KEY || ''),
        NODE_ENV: JSON.stringify(mode),
      }
    },
    envPrefix: 'VITE_',
  };
});
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.ZOOM_CLIENT_ID': JSON.stringify(env.ZOOM_CLIENT_ID),
        'process.env.ZOOM_CLIENT_SECRET': JSON.stringify(env.ZOOM_CLIENT_SECRET),
        'process.env.ZOOM_ACCOUNT_ID': JSON.stringify(env.ZOOM_ACCOUNT_ID),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        exclude: ['js-big-decimal']
      }
    };
});

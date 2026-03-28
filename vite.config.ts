import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(async () => {
  const plugins = [react(), tailwindcss()];
  try {
    // @ts-ignore
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {}
  return {
    plugins,
    server: {
      proxy: {
        '/api/cricket': {
          target: 'https://cricket.sportmonks.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/cricket/, '/api/v2.0'),
          secure: true,
        },
      },
    },
  };
})

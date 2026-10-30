import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
        }
      }
    }
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/bmkg-api': {
        target: 'https://api.bmkg.go.id',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bmkg-api/, ''),
        secure: false,
      },
      '/esp32-proxy': {
        target: 'http://192.168.18.3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/esp32-proxy/, ''),
        secure: false,
      }
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Agrinex Weather Station Dashboard',
        short_name: 'AgrinexWeather',
        description: 'Real-Time Weather Station & BMKG Comparison Dashboard',
        theme_color: '#e0e5ec'
      }
    })
  ],
});

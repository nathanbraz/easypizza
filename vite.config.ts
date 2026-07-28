import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3333,
    strictPort: true,
    host: true, // Permite conexões via 0.0.0.0 / lvh.me
    allowedHosts: true, // Obrigatório no Vite 6+ para permitir hostnames customizados como .lvh.me
  },
})

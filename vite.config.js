import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Team_Task_Manage_Simple_Backend/',
  server: {
    port: 3000,
    open: true
  }
})

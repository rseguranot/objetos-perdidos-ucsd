import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
            { name: 'firebase-sdk', test: /node_modules[\\/]@firebase[\\/]/, maxSize: 300_000, priority: 10 },
          ],
        },
      },
    },
  },
})

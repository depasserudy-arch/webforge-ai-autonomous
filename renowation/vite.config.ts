import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build:preview` produit un aperçu autonome en un seul fichier HTML.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'preview' ? [viteSingleFile()] : [])],
  ...(mode === 'preview' && { build: { outDir: 'preview', emptyOutDir: true } }),
}))

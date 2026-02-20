import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm',
          dest: 'ort',
        },
        {
          src: 'node_modules/onnxruntime-web/dist/ort-wasm.wasm',
          dest: 'ort',
        },
        {
          src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd.jsep.wasm',
          dest: 'ort',
        },
      ],
    }),
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  base:'./',
  build:{outDir:'dist',emptyOutDir:true,rollupOptions:{input:{demo:resolve(import.meta.dirname,'index.html'),cloud:resolve(import.meta.dirname,'cloud.html')}}},
  server:{host:'127.0.0.1',port:5173}
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const publicBase = (raw: string | undefined, fallback: string) => {
  let base = (raw || fallback).trim() || fallback;
  if (!base.startsWith('/')) base = `/${base}`;
  if (base !== '/' && !base.endsWith('/')) base = `${base}/`;
  return base;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = publicBase(env.VITE_BASE, mode === 'production' ? '/' : '/billing/');

  return {
    plugins: [react()],
    base,
    envPrefix: 'VITE_',
    server: {
      port: 5174,
      host: true,
      open: base,
    },
    preview: {
      port: 5174,
      host: true,
    },
    build: {
      outDir: 'build',
      sourcemap: false,
      emptyOutDir: true,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'react-redux',
        '@reduxjs/toolkit',
        'axios',
        'bootstrap',
      ],
    },
  };
});

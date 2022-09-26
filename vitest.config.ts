import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@/types': path.resolve(__dirname, './src/types'),
      '@/repository': path.resolve(__dirname, './src/repository'),
      '@/filesystem': path.resolve(__dirname, './src/filesystem'),
      '@/parser': path.resolve(__dirname, './src/parser'),
      '@/search': path.resolve(__dirname, './src/search'),
      '@/revision': path.resolve(__dirname, './src/revision'),
      '@/ai': path.resolve(__dirname, './src/ai'),
      '@/git': path.resolve(__dirname, './src/git'),
      '@': path.resolve(__dirname, '.'),
    },
  },
});

/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/loan-repayments/',
  test: {
    globals: true,
  },
});

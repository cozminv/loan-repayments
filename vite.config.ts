/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

/** Must match the GitHub repo name for project Pages: /loan-repayments/ */
const BASE = '/loan-repayments/';

export default defineConfig({
  base: BASE,
  server: {
    open: BASE,
  },
  preview: {
    open: BASE,
  },
  build: {
    // Avoid crossorigin on assets (can block CSS in some environments)
    modulePreload: false,
  },
  test: {
    globals: true,
  },
});

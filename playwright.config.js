import process from 'node:process'
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 8000 },
  reporter: [['list'], ['json', { outputFile: 'output/qa/results.json' }]],
  outputDir: 'output/qa/artifacts',
  use: { launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {}, baseURL: 'http://127.0.0.1:5175/Innovation/', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: 'VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175/Innovation/',
    reuseExistingServer: false
  }
})

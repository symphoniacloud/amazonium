import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
})

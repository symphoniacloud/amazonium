import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    poolOptions: {
      threads: {
        singleThread: true, // Sequential execution to avoid stack name conflicts
      },
    },
    testTimeout: 300000, // 5 minutes - CloudFormation deployments are slow
    hookTimeout: 300000, // 5 minutes for setup/teardown
  },
})

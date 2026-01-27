#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
import { createStackProps } from './initSupport.js'
import { DEFAULT_STACK_NAME, S3DemoStack } from './S3DemoStack.js'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

try {
  // Load .env file (this is Node 22+)
  process.loadEnvFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env'))
} catch {
  // .env file doesn't exist or can't be read, that's okay
}

const app = new App()
new S3DemoStack(app, createStackProps(app, DEFAULT_STACK_NAME))

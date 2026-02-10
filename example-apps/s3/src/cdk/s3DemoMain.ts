#!/usr/bin/env node
import { defineSingleStackAZApp } from '../azcdk/AZApp.js'
import { APP_PROPS, S3DemoStack } from './s3DemoApp.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// NB the "#!" line at the top - this file is executed by CDK

try {
  // Walk up from this file to find .env (this is Node 22+)
  const thisDir = path.dirname(fileURLToPath(import.meta.url))
  // TODO - this will need to change when this becomes a library
  process.loadEnvFile(path.resolve(thisDir, '../../.env'))
} catch {
  // .env file doesn't exist or can't be read, that's okay
}

defineSingleStackAZApp(APP_PROPS, S3DemoStack)

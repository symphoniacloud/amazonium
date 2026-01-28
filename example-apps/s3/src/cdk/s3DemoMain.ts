#!/usr/bin/env node
import { defineSingleStackAZApp } from '../azcdk/AZApp.js'
import { APP_PROPS, S3DemoStack } from './s3DemoApp.js'

// NB the "#!" line at the top - this file is executed by CDK

defineSingleStackAZApp(APP_PROPS, S3DemoStack)

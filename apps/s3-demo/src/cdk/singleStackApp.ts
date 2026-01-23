#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
import { createStackProps } from './initSupport'
import { S3DemoStack } from './S3DemoStack'

const DEFAULT_STACK_NAME = 's3-demo'

const app = new App()
new S3DemoStack(app, 'S3Demo', createStackProps(app, DEFAULT_STACK_NAME))

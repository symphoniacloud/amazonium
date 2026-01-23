#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
import { createStackProps } from './initSupport'
import { DEFAULT_STACK_NAME, S3DemoStack } from './S3DemoStack'

const app = new App()
new S3DemoStack(app, createStackProps(app, DEFAULT_STACK_NAME))

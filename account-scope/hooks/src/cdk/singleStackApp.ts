#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
import { createStackProps } from './initSupport'
import { DEFAULT_STACK_NAME, HooksStack } from './HooksStack'

const app = new App()
new HooksStack(app, createStackProps(app, DEFAULT_STACK_NAME))

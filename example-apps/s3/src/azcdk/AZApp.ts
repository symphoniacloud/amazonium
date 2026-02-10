import { App, Environment } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { AZStack, AZStackProps } from './AZStack.js'
import { throwFunction } from '../util/errors.js'

export interface AZAppProps {
  appName: string
}

export interface SingleStackAZAppProps extends AZAppProps {
  stackId: string
}

// Constructor type for classes extending AZStack
type AZStackConstructor<T extends AZStack> = new (scope: Construct, props: AZStackProps) => T

// instance name comes from environment
// TODO - need to add app specific props, probably
export function defineSingleStackAZApp<T extends AZStack>(
  appProps: SingleStackAZAppProps,
  StackClass: AZStackConstructor<T>
): T {
  const app = new App()
  const stackProps = createAZStackProps(appProps.appName, appProps.stackId)
  return new StackClass(app, stackProps)
}

function createAZStackProps(appName: string, stackId: string): AZStackProps {
  const instanceName = getAppInstanceNameFromEnvironment()

  return {
    env: calcEnvironment(),
    appName,
    instanceName,
    stackId,
    stackName: calculateStackName(appName, stackId, instanceName)
  }
}

function calcEnvironment(): Required<Environment> {
  const account = process.env.CDK_DEFAULT_ACCOUNT
  const region = process.env.CDK_DEFAULT_REGION

  if (account && region) return { account, region }

  throw new Error('Unable to read CDK_DEFAULT_ACCOUNT or CDK_DEFAULT_REGION')
}

export function getAppInstanceNameFromEnvironment() {
  return process.env.APP_INSTANCE_NAME ?? throwFunction('APP_INSTANCE_NAME must be defined in environment')()
}

export function calculateStackName(appName: string, stackId: string, instanceName: string) {
  return `${appName}-${instanceName}-${stackId}`
}

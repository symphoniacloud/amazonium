import { Environment, Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export interface AZStackProps extends StackProps {
  env: Required<Environment>
  appName: string
  instanceName: string
  stackId: string
  // Stack name is the concrete CloudFormation stack name
  stackName: string
}

export abstract class AZStack extends Stack {
  protected constructor(scope: Construct, props: AZStackProps) {
    // TODO - Pascalify stack ID
    super(scope, props.stackId, props)
  }
}

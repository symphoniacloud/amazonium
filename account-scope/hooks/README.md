# Amazonium Account-Scope CloudFormation Hooks

Account-scope CloudFormation Hooks for the Amazonium project, providing automated compliance and governance controls for AWS resources deployed via CloudFormation.

## Overview

This project deploys CloudFormation Hooks that enforce organizational policies and best practices at the account level. Hooks are proactive controls that validate resource configurations before CloudFormation provisions or updates them.

## Project Structure

```
.
├── src/
│   ├── cdk/                    # CDK infrastructure code
│   │   ├── HooksStack.ts       # Main CDK stack
│   │   ├── singleStackApp.ts   # CDK app entry point
│   │   ├── initSupport.ts      # Stack initialization helpers
│   │   └── cdk.json            # CDK configuration
│   └── guard/                  # CloudFormation Guard rules
│       └── resource-scope/
│           └── s3-resource.guard   # S3 bucket policies
├── test/
│   └── guard/                  # Guard rule tests
│       ├── test-guards.sh      # Test runner script
│       ├── templates/          # Test templates
│       └── README.md           # Test documentation
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

## Prerequisites

- Node.js >= 22.0.0 (see `.nvmrc`)
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)
- CloudFormation Guard CLI (`brew install cloudformation-guard`) - for local Guard rule testing
- Permissions to deploy CloudFormation Hooks and related resources

## Setup

Install dependencies:

```bash
npm install
```

Bootstrap CDK (if not already done for your account/region):

```bash
cd src/cdk && npx cdk bootstrap
```

## Development Workflow

### Local Checks

Run TypeScript compilation, linting, and formatting checks:

```bash
npm run local-checks
```

Individual commands:

```bash
npm run lint      # ESLint checks
npm run format    # Prettier formatting checks
```

### Test Guard Rules Locally

Test CloudFormation Guard rules before deployment:

```bash
npm run local-test-hooks
```

This validates Guard rules against test templates to ensure they work correctly. See [test/guard/README.md](test/guard/README.md) for details.

### View Changes

Preview infrastructure changes before deployment:

```bash
npm run cdk-diff
```

### Deployment

Deploy the hooks stack to your AWS account:

```bash
npm run deploy
```

### Remote Tests

Run integration tests against deployed resources:

```bash
npm run remote-tests
```

### Clean Up

Remove the deployed stack:

```bash
npm run cdk-destroy
```

## CloudFormation Hooks

### S3 Bucket Resource Hook

**Location**: `src/guard/resource-scope/s3-resource.guard`

**Purpose**: Enforces S3 bucket security and naming standards.

**Rules**:
- `S3_BUCKET_ENCRYPTION_REQUIRED`: Ensures BucketEncryption property is configured
- `S3_BUCKET_ENCRYPTION_ALGORITHM`: Validates encryption uses KMS (`aws:kms`) or AES256
- `S3_BUCKET_NAMING_CONVENTION`: Ensures BucketName property exists
- `S3_BUCKET_NAMING_PATTERN`: Validates bucket names follow the pattern `{stackName}-{account}-{region}-bucket` using runtime context

**Context-Aware Validation**: The naming pattern rule uses `HookContext` to extract:
- AWS Account ID from `HookContext.AWSAccountID`
- Region from `HookContext.StackId` ARN
- Stack name from `HookContext.StackId` ARN

This ensures bucket names match the actual deployment context, preventing misconfigurations.

**Behavior**: CloudFormation will fail stack operations if S3 buckets don't meet these requirements.

## CI/CD

The complete CI/CD pipeline can be run with:

```bash
npm run cicd
```

This runs:
1. Clean install (`npm ci`)
2. Local checks (TypeScript, linting, formatting)
3. Deployment
4. Remote integration tests

## Configuration

### Stack Name

The default stack name is `amazonium-hooks`. Override via:

- Environment variable: `STACK_NAME=my-custom-name npm run deploy`
- CDK context: `npx cdk deploy --context stackName=my-custom-name`

### AWS Environment

CDK uses environment variables for account/region targeting:
- `CDK_DEFAULT_ACCOUNT`
- `CDK_DEFAULT_REGION`

These are automatically set by the AWS CLI configuration.

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run local-checks` | Run TypeScript compilation, linting, and formatting checks |
| `npm run lint` | Run ESLint with auto-fix dry-run |
| `npm run format` | Check code formatting with Prettier |
| `npm run local-test-hooks` | Test CloudFormation Guard rules locally |
| `npm run deploy` | Deploy the hooks stack |
| `npm run cdk-diff` | Show infrastructure changes |
| `npm run cdk-destroy` | Delete the deployed stack |
| `npm run remote-tests` | Run integration tests |
| `npm run cicd` | Full CI/CD pipeline |

## Contributing

1. Create feature branches from `main`
2. Run `npm run local-checks` before committing
3. Ensure all tests pass with `npm run remote-tests` after deployment
4. Follow existing code style and patterns

## License

Part of the Amazonium project by Symphonia/Slaterock.

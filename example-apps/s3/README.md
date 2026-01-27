# AWS CDK S3 Example

TypeScript CDK application demonstrating S3 bucket creation with security best practices.

## Prerequisites

- Node.js 22+
- AWS credentials configured
- AWS CDK CLI

## Quick Start

```bash
# Install dependencies
npm ci

# Run checks (type check, lint, format)
npm run local-checks

# Deploy to AWS
npm run deploy

# Run remote tests against deployed stack
npm run remote-tests
```

## Configuration

Copy `.env.example` to `.env` and set your stack name to avoid conflicts:

```bash
STACK_NAME=your-unique-stack-name
```

The stack name is used to construct the bucket name: `${stackName}-${account}-${region}-b1`

## Project Structure

- `src/cdk/` - CDK application code
- `src/cicd/` - CI/CD infrastructure (CloudFormation template and deployment script)
- `test/remote/` - Integration tests that run against deployed stack
- `package.json` - Available scripts and dependencies

## Available Scripts

See `package.json` for all scripts. Key commands:
- `npm run local-checks` - Type check, lint, and format check
- `npm run deploy` - Deploy stack
- `npm run remote-tests` - Run integration tests
- `npm run cicd` - Full CI/CD pipeline (install, checks, deploy, test)

## CI/CD

Deploy the CodeBuild infrastructure:

```bash
cd src/cicd
./deploy.sh
```

Start a build manually:

```bash
aws codebuild start-build --project-name amazonium-examples-cicd-s3
```

## Notes

- CDK synth output goes to `build/cdk.out` instead of default `cdk.out`
- Remote tests use vitest and expect the stack to be deployed

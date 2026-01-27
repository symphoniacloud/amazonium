# Amazonium CloudFormation Hooks

CloudFormation Hooks that enforce S3 bucket security and naming standards at the account level.

## Prerequisites

- Node.js >= 22 (see `.nvmrc`)
- AWS CLI configured
- CloudFormation Guard CLI for local testing (`brew install cloudformation-guard`)

## Quick Start

```bash
npm install
npm run deploy              # Deploy hooks to AWS
npm run remote-tests        # Run integration tests
```

## Project Structure

- `src/cdk/` - CDK infrastructure (HooksStack.ts is the main stack)
- `src/guard/resource-scope/` - Guard rules for hook policies
- `src/cicd/` - CodeBuild setup for CI/CD
- `test/local/guard/` - Local Guard rule tests (see README there)
- `test/remote/` - Integration tests against deployed hooks (see README there)

## S3 Hook Rules

**Location:** `src/guard/resource-scope/s3-resource.guard`

- **Encryption:** Must use KMS or AES256
- **Naming:** Must match `{stackName}-{account}-{region}-{suffix}` (lowercase alphanumeric suffix)

## Configuration

**Stack Name:** Default is `amazonium-hooks`. Override with `STACK_NAME` env var or `.env` file (see `.env.example`).

**Multi-Deployment:** Custom stack names automatically generate unique hook aliases and filters, allowing multiple deployments per account.

## Scripts

See `package.json` for all available scripts. Key commands:
- `npm run local-checks` - TypeScript, lint, format, local tests
- `npm run cicd` - Full pipeline (install, checks, deploy, remote tests)

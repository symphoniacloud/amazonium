# Local Guard Rule Tests

Test CloudFormation Guard rules locally before deploying to AWS.

## Prerequisites

(assuming on a Mac - see CFn Guard docs for alternative OSs)

```bash
brew install cloudformation-guard
```

## Running Tests

```bash
npm run local-test-hooks       # From project root
./test-guards.sh               # From this directory
```

## What's Tested

Rules in `src/guard/resource-scope/s3-resource.guard`:
- S3 encryption (must use KMS or AES256)
- S3 naming pattern (must match `{stackName}-{account}-{region}-{suffix}`)

## Structure

- `templates/s3-resource/valid/` - Compliant templates (should pass)
- `templates/s3-resource/invalid/` - Non-compliant templates (should fail)
- `test-guards.sh` - Test runner script

Templates include mock `HookContext` that simulates runtime CloudFormation context (account, region, stack name) used by Guard rules for validation.

## Adding Tests

1. Add YAML templates to `templates/{rule-name}/valid/` or `invalid/`
2. Update `test-guards.sh` to include new test cases

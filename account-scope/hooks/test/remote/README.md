# Remote Integration Tests

Integration tests that deploy actual CloudFormation stacks to validate Guard hooks work in AWS.

## Prerequisites

Deploy the hooks stack first:
```bash
npm run deploy
```

## Running Tests

```bash
npm run remote-tests
```

Expected: 2 tests pass in ~5 minutes (CloudFormation is slow)

## What's Tested

1. **Valid bucket** - Deploys encrypted S3 bucket, verifies success, cleans up
2. **Invalid bucket** - Deploys unencrypted bucket, verifies Guard blocks it, cleans up

Test stacks match pattern `test-{STACK_NAME}*` to trigger hook validation (see `src/cdk/HooksStack.ts` for filter config).

## Configuration

- `vitest.config.mts` - Sequential execution, 5-minute timeouts
- `templates/` - CloudFormation templates for valid/invalid buckets
- Uses `STACK_NAME` env var (or default `amazonium-hooks`) for hook stack name

## Troubleshooting

If tests leave orphaned stacks:
```bash
aws cloudformation delete-stack --stack-name test-{STACK_NAME}-{v|i}-{timestamp}
```

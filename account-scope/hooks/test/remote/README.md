# Remote Integration Tests for Guard Hooks

This directory contains remote integration tests that deploy actual CloudFormation stacks to validate that Guard hooks correctly enforce rules during stack operations.

## Overview

These tests validate the **deployment integration** of Guard hooks, not the guard logic itself (which is covered by local tests in `test/guard/`).

**Test Scope:**
- 1 valid S3 bucket deployment (should succeed)
- 1 invalid S3 bucket deployment (should be blocked by Guard hook)

## Prerequisites

Before running remote tests, ensure:

1. **Guard hooks are deployed:**
   ```bash
   npm run deploy
   ```

2. **AWS credentials are configured** with permissions to:
   - Create/delete CloudFormation stacks
   - Create/delete S3 buckets
   - Describe stacks and resources

## Running Tests

```bash
# Run all remote integration tests
npm run remote-tests

# Expected output:
# ✓ Valid S3 bucket deploys successfully
# ✓ Invalid S3 bucket deployment is blocked by Guard hook
# Total: 2 tests passed (~4-6 minutes)
```

## Test Details

### Valid Bucket Test

1. Deploys a CloudFormation stack with a properly encrypted S3 bucket
2. Waits for `CREATE_COMPLETE` status
3. Verifies the bucket has KMS encryption configured
4. Deletes the stack (fails test if cleanup fails)

**Stack name pattern:** `test-amazonium-hooks-valid-{timestamp}`

### Invalid Bucket Test

1. Attempts to deploy a stack with an S3 bucket lacking encryption
2. Expects deployment to fail
3. Verifies error message contains "Guard" or "Amazonium::Guard::S3Resource"
4. Cleans up any rollback stack (fails test if cleanup fails)

**Stack name pattern:** `test-amazonium-hooks-invalid-{timestamp}`

## Stack Filtering

Test stacks match the pattern `test-amazonium-hooks*`, which is configured in the Guard hook's stack filter (see `src/cdk/HooksStack.ts`). This ensures the hooks are applied during stack deployment.

## Cleanup Strategy

- Each test cleans up its own stack in a `finally` block
- Tests **fail if cleanup fails** (strict approach to prevent orphaned resources)
- Stack deletion waits for `DELETE_COMPLETE` before returning

## Verification

After running tests, verify no stacks are left behind:

```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `test-amazonium-hooks`)].StackName'
```

Expected: Empty array `[]`

## Configuration

Test configuration is in `vitest.config.mts`:
- **Sequential execution** (singleThread: true) to avoid naming conflicts
- **5-minute timeouts** for stack operations
- Pattern: matches all `*.test.ts` files in this directory

## Troubleshooting

**Test fails with "Hooks stack not deployed":**
```bash
npm run deploy
```

**Test times out:**
- CloudFormation operations can take 2-3 minutes per stack
- Default timeout is 5 minutes per test
- Check AWS CloudFormation console for stack status

**Orphaned stacks:**
If tests fail during cleanup, manually delete stacks:
```bash
aws cloudformation delete-stack --stack-name test-amazonium-hooks-{name}-{timestamp}
```

## Performance

- **2 test cases:** 1 valid + 1 invalid
- **~2-3 minutes per test** (CloudFormation deployment time)
- **Total runtime: ~4-6 minutes** (acceptable for integration tests)
- **Sequential execution:** prevents parallel conflicts

## Files

```
test/remote/
├── README.md                          # This file
├── guard-hooks.test.ts                # Test runner (2 tests)
├── vitest.config.mts                  # Vitest configuration
└── templates/
    ├── valid-bucket.yaml              # Valid S3 bucket (KMS encryption)
    └── invalid-bucket.yaml            # Invalid S3 bucket (no encryption)
```

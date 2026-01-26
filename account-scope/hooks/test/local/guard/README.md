# CloudFormation Guard Rule Tests

Local testing infrastructure for CloudFormation Guard rules before deployment.

## Prerequisites

Install CloudFormation Guard CLI:

```bash
# macOS
brew install cloudformation-guard

# Or download from GitHub
# https://github.com/aws-cloudformation/cloudformation-guard/releases
```

Verify installation:
```bash
cfn-guard --version
```

## Directory Structure

```
test/guard/
├── test-guards.sh          # Test runner script
├── templates/              # Test templates
│   └── s3-resource/       # S3 resource rule tests
│       ├── pass.yaml      # Compliant template
│       └── fail.yaml      # Non-compliant template
└── README.md              # This file
```

## Running Tests

### Run All Tests

```bash
npm run local-test-hooks
```

### Run Specific Rule Tests

```bash
cd test/guard
./test-guards.sh s3-resource
```

## Test Templates

### HookContext Structure

Test templates include a mock `HookContext` for local testing that simulates the runtime context provided by CloudFormation Hooks:

```yaml
HookContext:
  AWSAccountID: "123456789012"
  StackId: "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/..."
  HookTypeName: "AWS::S3::BucketGuard"
  HookTypeVersion: "1.0"
  InvocationPoint: "CREATE_PRE_PROVISION"
  TargetName: "AWS::S3::Bucket"
  TargetType: "RESOURCE"

Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test-stack-123456789012-us-east-1-bucket
      # ... other properties
```

The `HookContext` is used by Guard rules to:
- Extract the AWS account ID
- Extract the region from the StackId ARN
- Extract the stack name from the StackId ARN
- Validate bucket names match the runtime deployment context

### pass.yaml

Contains S3 buckets that comply with all Guard rules:
- ✅ Encryption is configured (KMS or AES256)
- ✅ BucketName property exists
- ✅ Bucket name matches pattern: `{stackName}-{account}-{region}-bucket`
- ✅ Name components match the HookContext values

### fail.yaml

Contains S3 buckets with various violations:
- ❌ Missing BucketEncryption property
- ❌ Invalid encryption algorithm
- ❌ Missing BucketName property
- ❌ Wrong naming pattern (doesn't match context)
- ❌ Wrong account ID in bucket name
- ❌ Wrong region in bucket name
- ❌ Missing `-bucket` suffix

## Guard Rules Being Tested

**Location**: `src/guard/resource-scope/s3-resource.guard`

### S3_BUCKET_ENCRYPTION_REQUIRED
Ensures all S3 buckets have a BucketEncryption property configured.

### S3_BUCKET_ENCRYPTION_ALGORITHM
Validates that encryption uses either `aws:kms` or `AES256` algorithm.

### S3_BUCKET_NAMING_CONVENTION
Checks that S3 buckets have a BucketName property defined.

### S3_BUCKET_NAMING_PATTERN
Validates bucket names follow the pattern: `{stackName}-{account}-{region}-bucket`

This rule extracts runtime values from HookContext:
- **Account ID**: `HookContext.AWSAccountID`
- **Region**: Extracted from `HookContext.StackId` ARN
- **Stack Name**: Extracted from `HookContext.StackId` ARN

The rule constructs the expected bucket name and validates an exact match.

## Test Output

Tests provide color-coded output:
- 🟢 Green checkmark (✓) - Test passed as expected
- 🔴 Red cross (✗) - Test failed unexpectedly

```
Testing S3 Resource Guard Rules
==================================
✓ S3 Resource Rules - PASS template (expected pass)
✓ S3 Resource Rules - FAIL template (expected fail)

========================================
Test Summary
========================================
Total Tests: 2
Passed: 2
Failed: 0

All tests passed!
```

## How It Works

The test script (`test-guards.sh`) does the following:

1. **Checks cfn-guard is installed**
2. **Runs validation** using:
   ```bash
   cfn-guard validate --rules <rule-file> --data <template-file>
   ```
3. **Verifies exit codes**:
   - Exit 0 = Template is compliant
   - Non-zero = Template violates rules
4. **Validates expectations**:
   - `pass.yaml` should return exit 0
   - `fail.yaml` should return non-zero
5. **Reports results** with summary statistics

## Adding New Tests

To add tests for new Guard rules:

1. **Create template directory**:
   ```bash
   mkdir test/guard/templates/{rule-name}
   ```

2. **Create test templates**:
   - `pass.yaml` - Compliant resources
   - `fail.yaml` - Non-compliant resources

3. **Add test function** to `test-guards.sh`:
   ```bash
   test_{rule_name}_rules() {
       local rule_file="$GUARD_DIR/{rule-name}.guard"
       local pass_template="$TEMPLATE_DIR/{rule-name}/pass.yaml"
       local fail_template="$TEMPLATE_DIR/{rule-name}/fail.yaml"

       test_rule "{Rule Name}" "$rule_file" "$pass_template" "true"
       test_rule "{Rule Name}" "$rule_file" "$fail_template" "false"
   }
   ```

4. **Update main()** function to call new test function

## CI/CD Integration

Guard rule tests can be integrated into the CI/CD pipeline:

```json
{
  "scripts": {
    "local-checks": "npx tsc && npm run lint && npm run format && npm run local-test-hooks"
  }
}
```

This ensures Guard rules are validated before:
- Committing code
- Deploying to AWS
- Running integration tests

## Resources

- [AWS CloudFormation Guard Documentation](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html)
- [Guard DSL Functions](https://github.com/aws-cloudformation/cloudformation-guard/blob/main/docs/FUNCTIONS.md)
- [Writing Guard Rules for Hooks](https://docs.aws.amazon.com/cloudformation-cli/latest/hooks-userguide/guard-hooks-write-rules.html)
- [Guard GitHub Repository](https://github.com/aws-cloudformation/cloudformation-guard)

#!/bin/bash
set -e

STACK_NAME="${STACK_NAME:-amazonium-examples-s3-codebuild}"

echo "Deploying CodeBuild stack $STACK_NAME"

aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file codebuild-stack.yaml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

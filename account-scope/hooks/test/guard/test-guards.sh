#!/bin/bash

# Test script for CloudFormation Guard rules
# Tests Guard rules against pass/fail test templates

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Base directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GUARD_DIR="$PROJECT_ROOT/src/guard/resource-scope"
TEMPLATE_DIR="$SCRIPT_DIR/templates"

# Check if cfn-guard is installed
if ! command -v cfn-guard &> /dev/null; then
    echo -e "${RED}Error: cfn-guard is not installed${NC}"
    echo "Install it with: brew install cloudformation-guard"
    echo "Or see: https://github.com/aws-cloudformation/cloudformation-guard"
    exit 1
fi

echo "CloudFormation Guard version: $(cfn-guard --version)"
echo ""

# Function to test a single rule against a template
# Args: rule_name, rule_file, template_file, should_pass (true/false)
test_rule() {
    local rule_name=$1
    local rule_file=$2
    local template_file=$3
    local should_pass=$4

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Run cfn-guard validate
    if cfn-guard validate --rules "$rule_file" --data "$template_file" &> /tmp/guard_output.txt; then
        # Guard returned success (exit code 0)
        if [ "$should_pass" = "true" ]; then
            echo -e "${GREEN}✓${NC} $rule_name - PASS template (expected pass)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}✗${NC} $rule_name - FAIL template (expected fail, got pass)"
            echo "Template should have failed but passed validation"
            cat /tmp/guard_output.txt
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        # Guard returned failure (non-zero exit code)
        if [ "$should_pass" = "false" ]; then
            echo -e "${GREEN}✓${NC} $rule_name - FAIL template (expected fail)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}✗${NC} $rule_name - PASS template (expected pass, got fail)"
            echo "Template should have passed but failed validation:"
            cat /tmp/guard_output.txt
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
}

# Function to test S3 resource rules
test_s3_resource_rules() {
    echo -e "${YELLOW}Testing S3 Resource Guard Rules${NC}"
    echo "=================================="

    local rule_file="$GUARD_DIR/s3-resource.guard"
    local pass_template="$TEMPLATE_DIR/s3-resource/pass.yaml"
    local fail_template="$TEMPLATE_DIR/s3-resource/fail.yaml"

    # Check if files exist
    if [ ! -f "$rule_file" ]; then
        echo -e "${RED}Error: Guard rule file not found: $rule_file${NC}"
        exit 1
    fi

    if [ ! -f "$pass_template" ]; then
        echo -e "${RED}Error: Pass template not found: $pass_template${NC}"
        exit 1
    fi

    if [ ! -f "$fail_template" ]; then
        echo -e "${RED}Error: Fail template not found: $fail_template${NC}"
        exit 1
    fi

    # Test pass scenario
    test_rule "S3 Resource Rules" "$rule_file" "$pass_template" "true"

    # Test fail scenario
    test_rule "S3 Resource Rules" "$rule_file" "$fail_template" "false"

    echo ""
}

# Main execution
main() {
    echo "Starting CloudFormation Guard Rule Tests"
    echo "========================================"
    echo ""

    # Run tests based on command-line argument
    if [ $# -eq 0 ]; then
        # No arguments - run all tests
        test_s3_resource_rules
    else
        # Run specific test
        case $1 in
            s3-resource)
                test_s3_resource_rules
                ;;
            *)
                echo -e "${RED}Unknown test: $1${NC}"
                echo "Available tests: s3-resource"
                exit 1
                ;;
        esac
    fi

    # Print summary
    echo "========================================"
    echo "Test Summary"
    echo "========================================"
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo ""

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        exit 1
    fi
}

# Run main function
main "$@"

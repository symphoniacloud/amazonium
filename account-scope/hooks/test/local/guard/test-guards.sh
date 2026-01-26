#!/bin/bash

# Test script for CloudFormation Guard rules
# Tests Guard rules against pass/fail test templates

set -e

# Test counters
TOTAL_TESTS=0
FAILED_TESTS=0
FAILED_TEST_NAMES=()

# Base directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
GUARD_DIR="$PROJECT_ROOT/src/guard/resource-scope"
TEMPLATE_DIR="$SCRIPT_DIR/templates"

# Check if cfn-guard is installed
if ! command -v cfn-guard &> /dev/null; then
    echo "Error: cfn-guard is not installed"
    echo "Install it with: brew install cloudformation-guard"
    exit 1
fi

# Function to test a single template file against a rule
# Args: test_name, rule_file, template_file, should_pass (true/false)
test_template() {
    local test_name=$1
    local rule_file=$2
    local template_file=$3
    local should_pass=$4

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Run cfn-guard validate
    if cfn-guard validate --rules "$rule_file" --data "$template_file" &> /dev/null; then
        # Guard returned success (exit code 0)
        if [ "$should_pass" = "false" ]; then
            FAILED_TESTS=$((FAILED_TESTS + 1))
            FAILED_TEST_NAMES+=("$test_name (expected fail, got pass)")
        fi
    else
        # Guard returned failure (non-zero exit code)
        if [ "$should_pass" = "true" ]; then
            FAILED_TESTS=$((FAILED_TESTS + 1))
            FAILED_TEST_NAMES+=("$test_name (expected pass, got fail)")
        fi
    fi
}

# Function to test rules for a specific resource type
test_resource_rules() {
    local resource_type=$1
    local rule_file="$GUARD_DIR/${resource_type}.guard"
    local valid_dir="$TEMPLATE_DIR/$resource_type/valid"
    local invalid_dir="$TEMPLATE_DIR/$resource_type/invalid"

    # Check if rule file exists
    if [ ! -f "$rule_file" ]; then
        echo "Error: Guard rule file not found: $rule_file"
        exit 1
    fi

    # Test all valid templates
    if [ -d "$valid_dir" ]; then
        for template in "$valid_dir"/*.yaml; do
            if [ -f "$template" ]; then
                local test_name=$(basename "$template" .yaml)
                test_template "$test_name" "$rule_file" "$template" "true"
            fi
        done
    fi

    # Test all invalid templates
    if [ -d "$invalid_dir" ]; then
        for template in "$invalid_dir"/*.yaml; do
            if [ -f "$template" ]; then
                local test_name=$(basename "$template" .yaml)
                test_template "$test_name" "$rule_file" "$template" "false"
            fi
        done
    fi
}

main() {
    # Find all resource type directories in templates/
    for resource_dir in "$TEMPLATE_DIR"/*; do
        if [ -d "$resource_dir" ]; then
            local resource_type=$(basename "$resource_dir")
            test_resource_rules "$resource_type"
        fi
    done

    # Print results
    if [ $FAILED_TESTS -eq 0 ]; then
        echo "$TOTAL_TESTS guard tests passed"
        exit 0
    else
        echo "Failed guard tests:"
        for test_name in "${FAILED_TEST_NAMES[@]}"; do
            echo "  $test_name"
        done
        exit 1
    fi
}

# Run main function
main

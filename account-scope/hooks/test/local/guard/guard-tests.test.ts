import { describe, test, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'

// Base directories
const SCRIPT_DIR = resolve(import.meta.dirname)
const PROJECT_ROOT = resolve(SCRIPT_DIR, '../../..')
const GUARD_DIR = join(PROJECT_ROOT, 'src/guard/resource-scope')
const TEMPLATE_DIR = join(SCRIPT_DIR, 'templates')

// Check if cfn-guard is installed
beforeAll(() => {
  try {
    execSync('cfn-guard --version', { stdio: 'pipe' })
  } catch {
    throw new Error(
      'cfn-guard is not installed. Install it with:\n' +
        '  macOS: brew install cloudformation-guard\n' +
        '  Windows: https://github.com/aws-cloudformation/cloudformation-guard#installation'
    )
  }
})

// Helper function to test a template against a guard rule
function testTemplate(ruleFile: string, templateFile: string, shouldPass: boolean): void {
  let guardPassed = false

  try {
    execSync(`cfn-guard validate --rules "${ruleFile}" --data "${templateFile}"`, {
      stdio: 'pipe'
    })
    guardPassed = true
  } catch {
    guardPassed = false
  }

  if (shouldPass && !guardPassed) {
    throw new Error('Expected guard to pass, but it failed')
  } else if (!shouldPass && guardPassed) {
    throw new Error('Expected guard to fail, but it passed')
  }
}

// Dynamically discover all resource type directories in templates/
const resourceTypes = readdirSync(TEMPLATE_DIR).filter((item) => {
  const itemPath = join(TEMPLATE_DIR, item)
  return statSync(itemPath).isDirectory()
})

// Create a test suite for each resource type
for (const resourceType of resourceTypes) {
  describe(`Guard rules for ${resourceType}`, () => {
    const ruleFile = join(GUARD_DIR, `${resourceType}.guard`)
    const validDir = join(TEMPLATE_DIR, resourceType, 'valid')
    const invalidDir = join(TEMPLATE_DIR, resourceType, 'invalid')

    // Check if rule file exists
    beforeAll(() => {
      if (!existsSync(ruleFile)) {
        throw new Error(`Guard rule file not found: ${ruleFile}`)
      }
    })

    // Test all valid templates
    if (existsSync(validDir)) {
      const validTemplates = readdirSync(validDir).filter((file) => file.endsWith('.yaml'))

      for (const template of validTemplates) {
        const templateName = basename(template, '.yaml')
        test(`${templateName} (valid) should pass`, () => {
          testTemplate(ruleFile, join(validDir, template), true)
        })
      }
    }

    // Test all invalid templates
    if (existsSync(invalidDir)) {
      const invalidTemplates = readdirSync(invalidDir).filter((file) => file.endsWith('.yaml'))

      for (const template of invalidTemplates) {
        const templateName = basename(template, '.yaml')
        test(`${templateName} (invalid) should fail`, () => {
          testTemplate(ruleFile, join(invalidDir, template), false)
        })
      }
    }
  })
}

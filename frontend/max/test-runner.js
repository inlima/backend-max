#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function runCommand(command, description) {
  log(`\n${description}`, 'cyan')
  log(`Running: ${command}`, 'blue')
  
  try {
    execSync(command, { stdio: 'inherit' })
    log(`✅ ${description} completed successfully`, 'green')
    return true
  } catch (error) {
    log(`❌ ${description} failed`, 'red')
    return false
  }
}

function checkDependencies() {
  log('\n🔍 Checking dependencies...', 'yellow')
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const requiredDeps = [
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@playwright/test',
    'jest',
    'jest-axe',
  ]
  
  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.devDependencies[dep] && !packageJson.dependencies[dep]
  )
  
  if (missingDeps.length > 0) {
    log(`❌ Missing dependencies: ${missingDeps.join(', ')}`, 'red')
    log('Run: npm install', 'yellow')
    return false
  }
  
  log('✅ All dependencies are installed', 'green')
  return true
}

function generateTestReport() {
  log('\n📊 Generating test report...', 'cyan')
  
  const reportData = {
    timestamp: new Date().toISOString(),
    testSuites: {
      unit: {
        description: 'Unit tests for components, hooks, and utilities',
        files: [
          '__tests__/components/contatos-table.test.tsx',
          '__tests__/components/section-cards.test.tsx',
          '__tests__/providers/websocket-provider.test.tsx',
          '__tests__/lib/api-client.test.ts',
        ]
      },
      integration: {
        description: 'Integration tests for WebSocket and real-time features',
        files: [
          '__tests__/integration/websocket-integration.test.tsx',
        ]
      },
      accessibility: {
        description: 'Accessibility tests using axe-core',
        files: [
          '__tests__/accessibility/accessibility.test.tsx',
        ]
      },
      e2e: {
        description: 'End-to-end tests using Playwright',
        files: [
          'e2e/dashboard.spec.ts',
          'e2e/contatos.spec.ts',
          'e2e/complete-user-flow.spec.ts',
          'e2e/performance.spec.ts',
        ]
      }
    },
    coverage: {
      target: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      }
    }
  }
  
  fs.writeFileSync('test-results/test-report.json', JSON.stringify(reportData, null, 2))
  log('✅ Test report generated at test-results/test-report.json', 'green')
}

function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'all'
  
  log('🧪 Frontend Testing Suite', 'bright')
  log('========================', 'bright')
  
  // Check if dependencies are installed
  if (!checkDependencies()) {
    process.exit(1)
  }
  
  // Create test results directory
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results', { recursive: true })
  }
  
  let success = true
  
  switch (command) {
    case 'unit':
      success = runCommand('npm run test -- --coverage', '🔬 Running unit tests')
      break
      
    case 'e2e':
      success = runCommand('npm run test:e2e', '🎭 Running E2E tests')
      break
      
    case 'e2e:ui':
      success = runCommand('npm run test:e2e:ui', '🎭 Running E2E tests with UI')
      break
      
    case 'accessibility':
      success = runCommand('npm run test -- --testPathPattern=accessibility', '♿ Running accessibility tests')
      break
      
    case 'performance':
      success = runCommand('npm run test:e2e -- performance.spec.ts', '⚡ Running performance tests')
      break
      
    case 'watch':
      success = runCommand('npm run test:watch', '👀 Running tests in watch mode')
      break
      
    case 'coverage':
      success = runCommand('npm run test:coverage', '📊 Running tests with coverage')
      break
      
    case 'all':
    default:
      log('\n🚀 Running full test suite...', 'bright')
      
      // Run unit tests with coverage
      success = runCommand('npm run test:coverage', '🔬 Running unit tests with coverage') && success
      
      // Run accessibility tests
      success = runCommand('npm run test -- --testPathPattern=accessibility', '♿ Running accessibility tests') && success
      
      // Install Playwright browsers if needed
      if (fs.existsSync('playwright.config.ts')) {
        runCommand('npx playwright install --with-deps', '🎭 Installing Playwright browsers')
        
        // Run E2E tests
        success = runCommand('npm run test:e2e', '🎭 Running E2E tests') && success
      }
      
      break
  }
  
  // Generate test report
  generateTestReport()
  
  if (success) {
    log('\n🎉 All tests completed successfully!', 'green')
    log('\nTest artifacts:', 'cyan')
    log('- Coverage report: coverage/lcov-report/index.html', 'blue')
    log('- E2E report: playwright-report/index.html', 'blue')
    log('- Test results: test-results/', 'blue')
  } else {
    log('\n💥 Some tests failed. Check the output above for details.', 'red')
    process.exit(1)
  }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('Frontend Testing Suite', 'bright')
  log('======================', 'bright')
  log('')
  log('Usage: node test-runner.js [command]', 'cyan')
  log('')
  log('Commands:', 'yellow')
  log('  all          Run all tests (default)', 'blue')
  log('  unit         Run unit tests only', 'blue')
  log('  e2e          Run E2E tests only', 'blue')
  log('  e2e:ui       Run E2E tests with UI', 'blue')
  log('  accessibility Run accessibility tests only', 'blue')
  log('  performance  Run performance tests only', 'blue')
  log('  watch        Run tests in watch mode', 'blue')
  log('  coverage     Run tests with coverage report', 'blue')
  log('')
  log('Examples:', 'yellow')
  log('  node test-runner.js unit', 'green')
  log('  node test-runner.js e2e', 'green')
  log('  node test-runner.js all', 'green')
  process.exit(0)
}

main()
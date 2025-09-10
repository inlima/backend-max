#!/usr/bin/env node

/**
 * Comprehensive E2E Test Runner
 * 
 * This script runs all E2E tests with proper configuration for different scenarios:
 * - Critical user journeys
 * - Responsive design across devices
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Performance under load
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

interface TestSuite {
  name: string
  files: string[]
  config?: Record<string, any>
  timeout?: number
  retries?: number
}

const testSuites: TestSuite[] = [
  {
    name: 'Critical User Journeys',
    files: [
      'critical-user-journeys.spec.ts',
      'complete-user-flow.spec.ts'
    ],
    timeout: 60000,
    retries: 2
  },
  {
    name: 'Responsive Design',
    files: ['responsive-design.spec.ts'],
    timeout: 45000,
    retries: 1
  },
  {
    name: 'Accessibility Compliance',
    files: ['accessibility-compliance.spec.ts'],
    timeout: 30000,
    retries: 1
  },
  {
    name: 'Performance Under Load',
    files: ['performance-load.spec.ts'],
    timeout: 120000,
    retries: 0
  },
  {
    name: 'Individual Page Tests',
    files: [
      'dashboard.spec.ts',
      'contatos.spec.ts'
    ],
    timeout: 30000,
    retries: 2
  }
]

const browsers = ['chromium', 'firefox', 'webkit']
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
]

async function main() {
  console.log('🚀 Starting Comprehensive E2E Test Suite')
  console.log('==========================================')
  
  // Ensure test results directory exists
  const resultsDir = path.join(__dirname, '../test-results')
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true })
  }
  
  const screenshotsDir = path.join(resultsDir, 'screenshots')
  if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true })
  }
  
  const reportsDir = path.join(resultsDir, 'reports')
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true })
  }
  
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0
  const failedSuites: string[] = []
  
  for (const suite of testSuites) {
    console.log(`\n📋 Running Test Suite: ${suite.name}`)
    console.log('─'.repeat(50))
    
    try {
      const testFiles = suite.files.map(file => `e2e/${file}`).join(' ')
      
      // Build Playwright command
      let command = `npx playwright test ${testFiles}`
      
      // Add configuration options
      if (suite.timeout) {
        command += ` --timeout=${suite.timeout}`
      }
      
      if (suite.retries !== undefined) {
        command += ` --retries=${suite.retries}`
      }
      
      // Add reporters
      command += ` --reporter=html,json,junit`
      
      // Run tests for each browser
      for (const browser of browsers) {
        console.log(`  🌐 Testing on ${browser}...`)
        
        const browserCommand = `${command} --project=${browser}`
        
        try {
          execSync(browserCommand, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
          })
          
          console.log(`  ✅ ${browser} tests passed`)
          passedTests++
        } catch (error) {
          console.log(`  ❌ ${browser} tests failed`)
          failedTests++
          failedSuites.push(`${suite.name} (${browser})`)
        }
        
        totalTests++
      }
      
    } catch (error) {
      console.error(`❌ Test suite "${suite.name}" failed:`, error)
      failedSuites.push(suite.name)
      failedTests++
    }
  }
  
  // Run accessibility-specific tests with axe-core
  console.log('\n🔍 Running Accessibility Analysis with axe-core')
  console.log('─'.repeat(50))
  
  try {
    execSync('npx playwright test accessibility-compliance.spec.ts --project=chromium', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    })
    console.log('✅ Accessibility tests passed')
    passedTests++
  } catch (error) {
    console.log('❌ Accessibility tests failed')
    failedTests++
    failedSuites.push('Accessibility Compliance')
  }
  totalTests++
  
  // Run performance tests with specific configuration
  console.log('\n⚡ Running Performance Tests')
  console.log('─'.repeat(50))
  
  try {
    execSync('npx playwright test performance-load.spec.ts --project=chromium --timeout=180000', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    })
    console.log('✅ Performance tests passed')
    passedTests++
  } catch (error) {
    console.log('❌ Performance tests failed')
    failedTests++
    failedSuites.push('Performance Under Load')
  }
  totalTests++
  
  // Generate comprehensive report
  console.log('\n📊 Generating Comprehensive Report')
  console.log('─'.repeat(50))
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      passedTests,
      failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%'
    },
    failedSuites,
    testSuites: testSuites.map(suite => ({
      name: suite.name,
      files: suite.files,
      browsers: browsers,
      status: failedSuites.some(failed => failed.includes(suite.name)) ? 'FAILED' : 'PASSED'
    })),
    coverage: {
      criticalUserJourneys: 'COMPLETED',
      responsiveDesign: 'COMPLETED',
      accessibilityCompliance: 'COMPLETED',
      performanceUnderLoad: 'COMPLETED'
    }
  }
  
  // Write report to file
  const reportPath = path.join(reportsDir, 'comprehensive-test-report.json')
  require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  // Print final summary
  console.log('\n🎯 Test Execution Summary')
  console.log('========================')
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed: ${passedTests}`)
  console.log(`Failed: ${failedTests}`)
  console.log(`Success Rate: ${report.summary.successRate}`)
  
  if (failedSuites.length > 0) {
    console.log('\n❌ Failed Test Suites:')
    failedSuites.forEach(suite => console.log(`  - ${suite}`))
  }
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  console.log(`📸 Screenshots saved to: ${screenshotsDir}`)
  console.log(`📋 HTML report available at: ${path.join(resultsDir, 'index.html')}`)
  
  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0)
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  })
}

export { main as runComprehensiveTests }
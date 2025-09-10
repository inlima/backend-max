# End-to-End Tests

This directory contains comprehensive E2E tests for the frontend application, covering critical user journeys, responsive design, accessibility compliance, and performance under load.

## Test Structure

### Test Files

- **`critical-user-journeys.spec.ts`** - Complete workflows that users perform in the application
- **`complete-user-flow.spec.ts`** - Existing comprehensive user flow tests
- **`responsive-design.spec.ts`** - Tests across multiple devices and screen sizes
- **`accessibility-compliance.spec.ts`** - WCAG 2.1 AA compliance testing
- **`performance-load.spec.ts`** - Performance testing with large datasets and concurrent operations
- **`dashboard.spec.ts`** - Dashboard-specific tests
- **`contatos.spec.ts`** - Contacts page tests

### Page Objects

- **`pages/base-page.ts`** - Base page object with common functionality
- **`pages/dashboard-page.ts`** - Dashboard page object
- **`pages/contatos-page.ts`** - Contacts page object
- **`pages/processos-page.ts`** - Processes page object
- **`pages/configuracoes-page.ts`** - Settings page object

### Utilities

- **`utils/test-data.ts`** - Test data generators and mock data
- **`global-setup.ts`** - Global test setup
- **`global-teardown.ts`** - Global test cleanup
- **`run-comprehensive-tests.ts`** - Comprehensive test runner script

## Running Tests

### Quick Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run comprehensive test suite
npm run test:e2e:comprehensive

# Run specific test categories
npm run test:e2e:critical      # Critical user journeys
npm run test:e2e:responsive    # Responsive design tests
npm run test:e2e:accessibility # Accessibility compliance
npm run test:e2e:performance   # Performance under load

# Run on specific devices
npm run test:e2e:mobile        # Mobile devices only
npm run test:e2e:desktop       # Desktop browsers only

# Run with UI mode
npm run test:e2e:ui
```

### Detailed Commands

```bash
# Run specific test file
npx playwright test e2e/critical-user-journeys.spec.ts

# Run on specific browser
npx playwright test --project=chromium

# Run with specific viewport
npx playwright test --project='Mobile Chrome'

# Run with debugging
npx playwright test --debug

# Run with trace
npx playwright test --trace on

# Generate report
npx playwright show-report
```

## Test Categories

### 1. Critical User Journeys

Tests complete workflows that represent real user behavior:

- **Complete law firm workflow**: Dashboard → Create contact → Create process → Configure settings
- **Client lifecycle**: WhatsApp contact → Qualification → Process creation → Case management
- **Bulk operations workflow**: Mass contact import → Bulk process creation → Bulk status updates
- **Error recovery workflow**: Network failures → Offline mode → Data synchronization

### 2. Responsive Design

Tests across multiple devices and screen sizes:

- **Viewports tested**:
  - Mobile: iPhone SE (320x568), iPhone 8 (375x667), iPhone 11 Pro Max (414x896)
  - Tablet: iPad Portrait (768x1024), iPad Landscape (1024x768)
  - Desktop: Laptop (1366x768), Desktop (1440x900), Large Desktop (1920x1080), 4K (2560x1440)

- **Features tested**:
  - Layout adaptation
  - Navigation patterns
  - Form interactions
  - Table vs card views
  - Touch interactions
  - Performance across devices

### 3. Accessibility Compliance

WCAG 2.1 AA compliance testing:

- **Keyboard Navigation**: Complete workflows using only keyboard
- **Screen Reader Compatibility**: ARIA labels, roles, and announcements
- **Focus Management**: Focus indicators, focus trapping in modals
- **Color Contrast**: Minimum 4.5:1 ratio compliance
- **Text Alternatives**: Alt text for images, labels for form controls
- **Semantic Structure**: Proper heading hierarchy, landmarks
- **Error Handling**: Accessible error messages and recovery

### 4. Performance Under Load

Performance testing with realistic load conditions:

- **Large Datasets**: 10,000+ contacts, 5,000+ processes
- **Concurrent Operations**: Multiple simultaneous user actions
- **Memory Management**: Memory leak detection during extended usage
- **Network Conditions**: Slow 3G simulation, network failures
- **CPU Throttling**: Performance under CPU constraints
- **WebSocket Load**: High-frequency real-time updates

## Configuration

### Playwright Configuration

The tests use the configuration in `playwright.config.ts`:

- **Browsers**: Chromium, Firefox, WebKit
- **Mobile Devices**: Pixel 5, iPhone 12
- **Timeouts**: 30s default, extended for performance tests
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Traces**: On first retry

### Environment Variables

```bash
# Base URL for testing
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Enable debug mode
DEBUG=pw:api

# Disable headless mode
HEADED=true
```

## Test Data

### Mock Data Strategy

Tests use comprehensive mock data to ensure consistent results:

- **Dashboard**: Large metrics datasets, chart data with 365 days
- **Contacts**: 10,000+ contact records with realistic data
- **Processes**: Complex process data with timelines and relationships
- **Real-time**: WebSocket event simulation

### Data Generators

```typescript
// Generate random test data
const contato = generateRandomContato()
const processo = generateRandomProcesso()

// Use predefined test data
const testContato = testContatos.novo
const testProcesso = testProcessos.trabalhista
```

## Debugging

### Visual Debugging

```bash
# Run with browser visible
npx playwright test --headed

# Run with slow motion
npx playwright test --headed --slowMo=1000

# Run specific test with debug
npx playwright test critical-user-journeys.spec.ts --debug
```

### Trace Analysis

```bash
# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots and Videos

- Screenshots are automatically taken on test failures
- Videos are recorded for failed tests
- Visual regression screenshots are saved for responsive tests

## Continuous Integration

### GitHub Actions Integration

```yaml
- name: Run E2E Tests
  run: |
    npm run test:e2e:comprehensive
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: frontend/max/test-results/
```

### Test Reports

The comprehensive test runner generates:

- **HTML Report**: Visual test results with screenshots
- **JSON Report**: Machine-readable test results
- **JUnit Report**: CI/CD integration format
- **Custom Report**: Comprehensive summary with coverage metrics

## Best Practices

### Writing Tests

1. **Use Page Objects**: Encapsulate page interactions
2. **Mock External Dependencies**: Use consistent mock data
3. **Test Real User Flows**: Focus on complete workflows
4. **Handle Async Operations**: Proper waiting strategies
5. **Accessibility First**: Include accessibility checks in all tests

### Performance Considerations

1. **Parallel Execution**: Tests run in parallel by default
2. **Resource Cleanup**: Proper cleanup in teardown
3. **Selective Testing**: Use test tags for targeted runs
4. **Mock Heavy Operations**: Mock slow API calls and large datasets

### Maintenance

1. **Regular Updates**: Keep tests updated with UI changes
2. **Flaky Test Management**: Identify and fix unstable tests
3. **Coverage Monitoring**: Ensure critical paths are covered
4. **Performance Baselines**: Monitor performance regression

## Troubleshooting

### Common Issues

1. **Timeouts**: Increase timeout for slow operations
2. **Element Not Found**: Use proper waiting strategies
3. **Flaky Tests**: Add proper waits and retries
4. **Memory Issues**: Clean up resources in teardown

### Debug Commands

```bash
# Check Playwright installation
npx playwright --version

# Install browsers
npx playwright install

# Run system check
npx playwright doctor

# Clear cache
npx playwright cache clear
```

## Contributing

When adding new tests:

1. Follow the existing page object pattern
2. Add comprehensive mock data
3. Include accessibility checks
4. Test across multiple viewports
5. Update this README with new test categories
6. Ensure tests are deterministic and not flaky

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Performance Best Practices](https://web.dev/performance/)
- [Responsive Design Principles](https://web.dev/responsive-web-design-basics/)
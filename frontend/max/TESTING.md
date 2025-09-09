# Testing Guide - Frontend Dashboard Advocacia

This document provides comprehensive information about the testing setup and practices for the Frontend Dashboard Advocacia project.

## Overview

The testing strategy covers multiple layers to ensure quality, accessibility, and performance:

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: WebSocket and real-time feature testing  
- **Accessibility Tests**: WCAG compliance and screen reader compatibility
- **End-to-End Tests**: Complete user workflow testing
- **Performance Tests**: Load time and responsiveness testing

## Test Structure

```
frontend/max/
├── __tests__/                    # Unit and integration tests
│   ├── components/              # Component tests
│   ├── providers/               # Provider tests
│   ├── lib/                     # Utility tests
│   ├── integration/             # Integration tests
│   ├── accessibility/           # Accessibility tests
│   └── utils/                   # Test utilities
├── e2e/                         # End-to-end tests
│   ├── pages/                   # Page object models
│   ├── utils/                   # E2E test utilities
│   └── *.spec.ts               # Test specifications
├── jest.config.js              # Jest configuration
├── jest.setup.js               # Jest setup file
├── playwright.config.ts        # Playwright configuration
└── test-runner.js              # Custom test runner
```

## Getting Started

### Prerequisites

Ensure all testing dependencies are installed:

```bash
npm install
```

### Running Tests

#### Quick Start
```bash
# Run all tests
node test-runner.js

# Or use npm scripts
npm test                    # Unit tests
npm run test:e2e           # E2E tests
npm run test:coverage      # Coverage report
```

#### Specific Test Types
```bash
# Unit tests only
node test-runner.js unit

# E2E tests only  
node test-runner.js e2e

# E2E tests with UI
node test-runner.js e2e:ui

# Accessibility tests
node test-runner.js accessibility

# Performance tests
node test-runner.js performance

# Watch mode for development
node test-runner.js watch
```

## Unit Tests

### Component Testing

Components are tested using React Testing Library with focus on:
- Rendering behavior
- User interactions
- Props handling
- State management
- Accessibility

Example:
```typescript
// __tests__/components/contatos-table.test.tsx
import { render, screen, fireEvent } from '../utils/test-utils'
import { ContatosTable } from '@/components/contatos-table'

test('renders contatos table with data', () => {
  render(
    <ContatosTable
      data={mockContatos}
      onSelectContato={mockOnSelect}
    />
  )
  
  expect(screen.getByText('João Silva')).toBeInTheDocument()
})
```

### Provider Testing

WebSocket and context providers are tested for:
- Connection management
- Event handling
- State synchronization
- Error recovery

### API Client Testing

API client tests cover:
- Request/response handling
- Authentication
- Error handling
- Security headers

## Integration Tests

### WebSocket Integration

Tests real-time functionality:
- Connection establishment
- Event broadcasting
- State synchronization
- Reconnection logic

Example:
```typescript
test('should handle real-time contato updates', async () => {
  // Simulate WebSocket event
  act(() => {
    novoContatoHandler(novoContato)
  })

  await waitFor(() => {
    expect(screen.getByTestId('contatos-count')).toHaveTextContent('2')
  })
})
```

## Accessibility Tests

### WCAG Compliance

Using `jest-axe` to test:
- Color contrast
- Keyboard navigation
- Screen reader compatibility
- ARIA labels and roles
- Form accessibility

Example:
```typescript
test('should be accessible', async () => {
  const { container } = render(<ContatosTable data={mockData} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Manual Accessibility Testing

- Keyboard navigation testing
- Screen reader testing
- High contrast mode testing
- Focus management testing

## End-to-End Tests

### Page Object Model

E2E tests use the Page Object Model pattern:

```typescript
// e2e/pages/dashboard-page.ts
export class DashboardPage extends BasePage {
  async goto() {
    await this.navigateTo('/dashboard')
  }
  
  async expectMetricsVisible() {
    await expect(this.metricsCards).toBeVisible()
  }
}
```

### Test Scenarios

1. **Dashboard Flow**: Metrics loading, chart interaction, real-time updates
2. **Contatos Flow**: CRUD operations, filtering, search, pagination
3. **Complete User Flow**: End-to-end workflows across modules
4. **Error Handling**: API failures, network issues, recovery

### Cross-Browser Testing

Tests run on:
- Chrome/Chromium
- Firefox
- Safari/WebKit
- Mobile Chrome
- Mobile Safari

## Performance Tests

### Metrics Measured

- **Page Load Time**: Initial page rendering
- **Core Web Vitals**: FCP, LCP, CLS
- **Bundle Size**: JavaScript and CSS size
- **Memory Usage**: Heap size monitoring
- **Network Performance**: Request timing

### Performance Budgets

- Page load: < 3 seconds
- FCP: < 1.8 seconds  
- LCP: < 2.5 seconds
- Bundle size: < 1MB JS, < 256KB CSS
- Memory increase: < 50% during session

Example:
```typescript
test('dashboard should load within performance budget', async () => {
  const loadTime = await dashboardPage.measureDashboardLoadTime()
  expect(loadTime).toBeLessThan(3000)
})
```

## Test Data Management

### Mock Data

Consistent mock data across tests:
```typescript
// __tests__/utils/test-utils.tsx
export const mockContato = {
  id: '1',
  nome: 'João Silva',
  telefone: '+5511999999999',
  // ... other properties
}
```

### API Mocking

- Jest mocks for unit tests
- Playwright route mocking for E2E tests
- Realistic response delays
- Error scenario simulation

## Coverage Requirements

### Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

### Coverage Reports

- HTML report: `coverage/lcov-report/index.html`
- JSON report: `coverage/coverage-final.json`
- Text summary in console

## Continuous Integration

### GitHub Actions Integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    npm run test:coverage
    npm run test:e2e
```

### Test Artifacts

- Coverage reports
- E2E screenshots/videos
- Performance metrics
- Accessibility reports

## Best Practices

### Writing Tests

1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow AAA pattern
3. **Single Responsibility**: One assertion per test when possible
4. **Mock External Dependencies**: Isolate units under test
5. **Test User Behavior**: Focus on user interactions, not implementation

### Accessibility Testing

1. **Automated + Manual**: Combine axe-core with manual testing
2. **Keyboard Navigation**: Test all interactive elements
3. **Screen Reader**: Test with actual screen readers
4. **Color Contrast**: Verify sufficient contrast ratios
5. **Focus Management**: Ensure proper focus handling

### Performance Testing

1. **Realistic Conditions**: Test with realistic data sizes
2. **Network Simulation**: Test on slow connections
3. **Memory Monitoring**: Watch for memory leaks
4. **Bundle Analysis**: Monitor bundle size growth
5. **Core Web Vitals**: Track user experience metrics

## Debugging Tests

### Unit Test Debugging

```bash
# Debug specific test
npm test -- --testNamePattern="specific test name"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### E2E Test Debugging

```bash
# Run with UI for debugging
npm run test:e2e:ui

# Debug mode with browser open
npx playwright test --debug

# Generate trace for failed tests
npx playwright test --trace on
```

### Common Issues

1. **Flaky Tests**: Use proper waits, avoid hardcoded timeouts
2. **Memory Leaks**: Clean up event listeners and subscriptions
3. **Race Conditions**: Use proper async/await patterns
4. **Mock Issues**: Ensure mocks are properly reset between tests

## Test Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep testing libraries current
2. **Review Coverage**: Maintain coverage thresholds
3. **Performance Monitoring**: Track performance regressions
4. **Accessibility Audits**: Regular accessibility reviews
5. **Test Data Updates**: Keep mock data realistic

### Refactoring Tests

1. **Extract Common Patterns**: Create reusable test utilities
2. **Update Page Objects**: Keep page objects in sync with UI changes
3. **Consolidate Assertions**: Group related assertions
4. **Remove Obsolete Tests**: Clean up tests for removed features

## Resources

### Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)

### Tools

- [Testing Library Queries](https://testing-library.com/docs/queries/about/)
- [Playwright Inspector](https://playwright.dev/docs/inspector)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

## Contributing

When adding new features:

1. **Write Tests First**: Follow TDD when possible
2. **Update Documentation**: Keep this guide current
3. **Check Coverage**: Ensure new code is covered
4. **Test Accessibility**: Include accessibility tests
5. **Performance Impact**: Consider performance implications

For questions or issues with testing, please refer to the project documentation or create an issue in the repository.
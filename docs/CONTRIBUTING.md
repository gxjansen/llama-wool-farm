# 🤝 Contributing to Llama Wool Farm

We welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or helping with design, your contribution is valuable.

## Quick Start

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Examples of behavior that contributes to creating a positive environment:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## Development Environment

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Git latest version

### Setup

```bash
# Clone your fork
git clone https://github.com/your-username/llama-wool-farm.git
cd llama-wool-farm

# Install dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Start development servers
npm run dev
```

## Contribution Types

### 🐛 Bug Reports

Before creating a bug report, please:
1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include steps to reproduce
4. Provide system information

**Bug Report Template:**
```markdown
**Bug Description**
A clear description of the bug.

**To Reproduce**
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- Device: [e.g. iPhone 12, Desktop]
- Browser: [e.g. Chrome 96, Safari 15]
- OS: [e.g. iOS 15, Windows 11]
- Game Version: [e.g. 1.2.3]

**Additional Context**
Any other relevant information.
```

### ✨ Feature Requests

For feature requests:
1. Check if the feature already exists
2. Use the feature request template
3. Explain the use case
4. Consider implementation complexity

**Feature Request Template:**
```markdown
**Feature Description**
A clear description of the feature.

**Problem Statement**
What problem does this solve?

**Proposed Solution**
How would you implement this feature?

**Alternatives Considered**
What other approaches did you consider?

**Additional Context**
Any other relevant information.
```

### 🔧 Code Contributions

#### Branch Naming

```bash
# Feature branches
feature/add-new-wool-type
feature/implement-achievements

# Bug fixes
fix/wool-calculation-error
fix/offline-progress-bug

# Documentation
docs/update-api-documentation
docs/improve-setup-guide

# Refactoring
refactor/optimize-game-state
refactor/improve-ui-components
```

#### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: type(scope): description
feat(game): add quantum wool type
fix(api): resolve offline calculation bug
docs(readme): update installation instructions
style(ui): improve button hover effects
refactor(core): optimize production calculations
test(unit): add game state manager tests
perf(render): improve particle system performance
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

#### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

**TypeScript Guidelines:**
- Use strict mode
- Define interfaces for all data structures
- Use descriptive variable names
- Add JSDoc comments for public APIs

```typescript
// Good example
interface GameState {
  woolCount: Decimal;
  soulShears: Decimal;
  buildings: BuildingState[];
  prestigeLevel: number;
}

/**
 * Calculates offline wool production based on time away
 * @param timeAway Time in milliseconds since last active
 * @param productionRate Current wool per second
 * @returns Amount of wool produced offline
 */
function calculateOfflineProgress(timeAway: number, productionRate: Decimal): Decimal {
  const maxOfflineTime = 24 * 60 * 60 * 1000; // 24 hours
  const effectiveTime = Math.min(timeAway, maxOfflineTime);
  return productionRate.times(effectiveTime / 1000);
}
```

### 🎨 Design Contributions

#### UI/UX Improvements
- Create mockups using Figma or similar tools
- Follow existing design patterns
- Consider mobile-first design
- Ensure accessibility compliance

#### Asset Creation
- Use consistent art style
- Optimize for web delivery
- Provide multiple resolutions
- Include source files when possible

### 📚 Documentation

#### Types of Documentation
- Code documentation (JSDoc)
- API documentation
- User guides
- Developer guides
- Architecture documentation

#### Documentation Standards
- Use clear, concise language
- Include code examples
- Add screenshots when helpful
- Keep documentation up to date

## Testing

### Test Types

#### Unit Tests
```bash
# Run unit tests
npm run test:unit

# Run specific test file
npm test -- GameState.test.ts

# Run with coverage
npm run test:coverage
```

#### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Test API endpoints
npm run test:api
```

#### E2E Tests
```bash
# Run end-to-end tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- --spec="game-progression.spec.ts"
```

### Test Guidelines

- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Mock external dependencies
- Test edge cases and error conditions

```typescript
// Good test example
describe('ProductionManager', () => {
  describe('calculateWoolProduction', () => {
    it('should calculate base wool production correctly', () => {
      const manager = new ProductionManager();
      const buildings = [
        { type: 'shearingStation', count: 5, level: 1 }
      ];
      
      const production = manager.calculateWoolProduction(buildings);
      
      expect(production.toNumber()).toBe(5); // 5 stations * 1 wool/sec
    });

    it('should apply building level multipliers', () => {
      const manager = new ProductionManager();
      const buildings = [
        { type: 'shearingStation', count: 1, level: 3 }
      ];
      
      const production = manager.calculateWoolProduction(buildings);
      
      expect(production.toNumber()).toBe(4); // 1 station * level 3 multiplier
    });
  });
});
```

## Pull Request Process

### Before Submitting

1. **Update Documentation**: Include relevant documentation updates
2. **Add Tests**: Ensure new code is tested
3. **Run Tests**: All tests must pass
4. **Check Linting**: Code must pass linting checks
5. **Update CHANGELOG**: Add entry for significant changes

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added and passing
- [ ] No breaking changes (or documented)

## Screenshots
If applicable, add screenshots of UI changes.

## Related Issues
Fixes #123
Related to #456
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests
2. **Code Review**: Team members review code
3. **Feedback**: Address review comments
4. **Approval**: Get approval from maintainers
5. **Merge**: Maintainer merges the PR

## Community Guidelines

### Getting Help

- **Discord**: Join our Discord server for real-time help
- **GitHub Issues**: Search existing issues first
- **Documentation**: Check the docs folder
- **Email**: Contact maintainers directly

### Communication

- Be respectful and professional
- Provide constructive feedback
- Ask questions when unclear
- Help others when possible

### Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README
- Social media shout-outs

## Project Structure

```
llama-wool-farm/
├── src/                    # Frontend source code
│   ├── game/              # Phaser.js game logic
│   ├── ui/                # React UI components
│   ├── services/          # API services
│   └── utils/             # Utility functions
├── backend/               # Backend API
│   ├── src/               # API source code
│   ├── tests/             # Backend tests
│   └── docs/              # API documentation
├── tests/                 # Frontend tests
├── docs/                  # Project documentation
├── public/                # Static assets
└── scripts/               # Build scripts
```

## Development Workflow

### Issue Lifecycle

1. **Issue Created**: Community member creates issue
2. **Triage**: Maintainers label and prioritize
3. **Assignment**: Issue assigned to contributor
4. **Development**: Contributor works on solution
5. **PR Submitted**: Pull request created
6. **Review**: Code review process
7. **Merge**: PR merged to main branch
8. **Release**: Changes included in next release

### Release Process

1. **Version Bump**: Update version numbers
2. **Changelog**: Update CHANGELOG.md
3. **Testing**: Run full test suite
4. **Build**: Create production build
5. **Deploy**: Deploy to staging/production
6. **Announce**: Notify community of release

## Specialized Contributions

### Game Balance

- Understand game mechanics
- Use mathematical models
- Test with simulations
- Consider player feedback

### Performance Optimization

- Profile code performance
- Optimize critical paths
- Minimize memory usage
- Improve load times

### Accessibility

- Follow WCAG guidelines
- Test with screen readers
- Ensure keyboard navigation
- Provide alternative text

### Internationalization

- Use i18n framework
- Provide translations
- Consider cultural differences
- Test with different locales

## Security

### Reporting Vulnerabilities

- **Email**: security@llamawoolfarm.com
- **Do NOT** create public issues for security bugs
- **Include**: Steps to reproduce, potential impact
- **Response**: We'll respond within 48 hours

### Security Guidelines

- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user inputs
- Follow OWASP guidelines

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing:
- Check existing documentation
- Search previous issues
- Ask on Discord
- Email maintainers: contribute@llamawoolfarm.com

Thank you for contributing to Llama Wool Farm! 🦙
# Pull Request Template

## Description
<!-- Provide a clear and concise description of what this PR does -->

### Summary
Brief summary of the changes made.

### Motivation
Why are these changes needed? What problem do they solve?

### Changes Made
<!-- List the key changes made in this PR -->
- Change 1
- Change 2
- Change 3

## Type of Change
<!-- Select all that apply by putting an 'x' in the brackets -->
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring (no functional changes)
- [ ] Test improvements
- [ ] Build/CI improvements
- [ ] Style/formatting changes

## Testing
<!-- Describe how you tested these changes -->

### Tests Added/Updated
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

### Test Coverage
- [ ] All new code is covered by tests
- [ ] Test coverage maintained or improved
- [ ] No decrease in overall test coverage

### Manual Testing
<!-- Describe manual testing performed -->
- [ ] Tested on desktop browsers (Chrome, Firefox, Safari)
- [ ] Tested on mobile devices (iOS, Android)
- [ ] Tested PWA functionality
- [ ] Tested offline capabilities
- [ ] Tested different game states
- [ ] Tested edge cases

### Test Results
```
# Paste test results here if applicable
npm test output or screenshots
```

## Code Quality
<!-- Confirm code quality standards are met -->

### Code Standards
- [ ] Code follows the project's style guidelines
- [ ] Code is properly formatted (Prettier)
- [ ] Code passes linting checks (ESLint)
- [ ] TypeScript compilation successful
- [ ] No console errors or warnings

### Code Review
- [ ] Self-review of code completed
- [ ] Code is well-commented where necessary
- [ ] Complex logic is documented
- [ ] Variable and function names are descriptive
- [ ] No hardcoded values (use constants/config)

## Performance Impact
<!-- Describe any performance implications -->

### Performance Considerations
- [ ] No negative performance impact
- [ ] Performance improvement included
- [ ] Performance tested and verified
- [ ] Bundle size impact considered

### Metrics
If applicable, provide performance metrics:
- **Bundle Size Change**: [e.g. +2KB, -5KB, no change]
- **Load Time Impact**: [e.g. -100ms, no impact]
- **Memory Usage**: [e.g. reduced by 10MB]
- **FPS Impact**: [e.g. improved from 45fps to 60fps]

## Documentation
<!-- Confirm documentation is updated -->

### Documentation Updates
- [ ] README.md updated (if applicable)
- [ ] API documentation updated (if applicable)
- [ ] Code comments added/updated
- [ ] Changelog updated
- [ ] No documentation changes needed

### Documentation Quality
- [ ] Documentation is clear and accurate
- [ ] Examples provided where helpful
- [ ] Screenshots included for UI changes

## Backward Compatibility
<!-- Consider backward compatibility -->

### Compatibility
- [ ] No breaking changes
- [ ] Breaking changes documented
- [ ] Migration guide provided (if needed)
- [ ] Deprecation warnings added (if needed)

### Save Game Compatibility
- [ ] Existing save games still work
- [ ] Save game migration implemented (if needed)
- [ ] Tested with various save game states

## Security
<!-- Consider security implications -->

### Security Review
- [ ] No security vulnerabilities introduced
- [ ] Input validation implemented
- [ ] No sensitive data exposed
- [ ] Authentication/authorization maintained

## Deployment
<!-- Consider deployment implications -->

### Deployment Considerations
- [ ] No special deployment steps required
- [ ] Environment variables documented
- [ ] Database migrations included (if needed)
- [ ] Rollback plan considered

## Related Issues
<!-- Link to related issues -->
- Fixes #123
- Related to #456
- Depends on #789

## Screenshots
<!-- Include screenshots for UI changes -->

### Before
<!-- Screenshots of the current behavior -->

### After
<!-- Screenshots of the new behavior -->

## Checklist
<!-- Final checklist before submitting -->

### Pre-submission Checklist
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

### Testing Checklist
- [ ] All tests pass
- [ ] Code coverage is maintained
- [ ] Manual testing completed
- [ ] Cross-browser testing completed (if UI changes)
- [ ] Mobile testing completed (if UI changes)

### Review Checklist
- [ ] PR title is descriptive
- [ ] PR description is complete
- [ ] Commits are properly formatted
- [ ] No merge conflicts
- [ ] All CI checks pass

## Additional Notes
<!-- Any additional information that reviewers should know -->

### Notes for Reviewers
- Pay special attention to...
- Known limitations...
- Future improvements planned...

### Follow-up Work
- [ ] No follow-up work needed
- [ ] Follow-up issues created: #___

## Breaking Changes
<!-- If this PR includes breaking changes, describe them here -->
<!-- Include migration instructions if needed -->

## Dependencies
<!-- List any new dependencies added -->
- New dependency: package-name@version - reason for adding

---

**Thank you for your contribution to Llama Wool Farm!** 🦙

**For reviewers:**
- Please review the code for functionality, performance, and security
- Test the changes locally if possible
- Provide constructive feedback
- Approve when ready for merge
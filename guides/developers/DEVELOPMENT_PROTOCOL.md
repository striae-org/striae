# Striae Development Protocol Guide

## Table of Contents

1. [Overview](#overview)
2. [Repository Structure](#repository-structure)
3. [Development Workflow](#development-workflow)
   - [Fork Management](#fork-management)
   - [Branch Strategy](#branch-strategy)
   - [Development Environment Setup](#development-environment-setup)
   - [Commit Guidelines](#commit-guidelines)
4. [Pull Request Process](#pull-request-process)
   - [PR Requirements](#pr-requirements)
   - [Review Process](#review-process)
   - [Merge Guidelines](#merge-guidelines)
   - [PR Description Requirements](#pr-description-requirements)
5. [Code Quality Standards](#code-quality-standards)
   - [Code Style](#code-style)
   - [Testing Requirements](#testing-requirements)
   - [Documentation](#documentation)
6. [Component Development Patterns](#component-development-patterns)
   - [Component Architecture](#component-architecture)
   - [Type Definition Management](#type-definition-management)
   - [Integration Testing Patterns](#integration-testing-patterns)
7. [Security Considerations](#security-considerations)
8. [Release Management](#release-management)
9. [Issue Management](#issue-management)
10. [Communication Guidelines](#communication-guidelines)
11. [Additional Best Practices](#additional-best-practices)
12. [Enforcement](#enforcement)
13. [Questions and Support](#questions-and-support)
    - [Internal Developer Program](#internal-developer-program)

## Overview

This guide establishes the development protocols and best practices for contributing to the Striae project. Following these guidelines ensures code quality, security, and maintainability while facilitating effective collaboration among contributors.

**👥 Developer Types**: This guide covers protocols for both internal developers (with team access) and external contributors (community members).

## Repository Structure

The Striae project uses different repository access patterns depending on your developer status:

### For External Contributors:
- **Production Repository**: `striae-org/striae` (fork this to your account)
- **Your Fork**: `your-username/striae` (where you make changes)
- **Contribution Flow**: Your Fork → Pull Request to `striae-org/striae`

### For Internal Developers:
- **Development Repository**: `striae-org/striae-dev` (direct access)
- **Production Repository**: `striae-org/striae` (for reference)
- **Contribution Flow**: Branch in `striae-org/striae-dev` → Pull Request within same repo

## Development Workflow

### Fork Management

**For External Contributors:**

1. **Fork the Repository**: Fork `striae-org/striae` to your GitHub account
2. **Clone Your Fork**: Work from your personal fork
3. **Keep Updated**: Regularly sync your fork with the upstream repository

```bash
# Initial setup
git clone https://github.com/YOUR_USERNAME/striae.git
cd striae

# Add upstream remote (one-time setup)
git remote add upstream https://github.com/striae-org/striae.git

# Sync your fork regularly
git fetch upstream
git checkout master
git merge upstream/master
git push origin master
```

**For Internal Developers:**

1. **Direct Access**: Clone `striae-org/striae-dev` directly (no forking needed)
2. **Branch-Based Workflow**: Create feature branches within the shared repository
3. **Keep Updated**: Regularly pull latest changes from the development repository

```bash
# Clone the development repository
git clone https://github.com/striae-org/striae-dev.git
cd striae-dev

# Stay updated
git checkout master
git pull origin master
```

### Branch Strategy

**Universal Guidelines (Both Developer Types):**

1. **Feature Branches**: Create descriptive feature branches from the latest `master` branch
2. **Branch Naming**: Use descriptive names following the pattern:
   - `feature/feature-name`
   - `bugfix/issue-description`
   - `hotfix/critical-fix`
   - `docs/documentation-update`

**For External Contributors:**
```bash
# Branch creation in your fork
git checkout master
git pull upstream master
git checkout -b feature/user-authentication-improvements
```

**For Internal Developers:**
```bash
# Branch creation in shared repository
git checkout master
git pull origin master
git checkout -b feature/user-authentication-improvements
```

### Development Environment Setup

**External Contributors:**
- Must set up their own Cloudflare services (Pages, Workers, KV, R2, Images, Turnstile)
- Must configure their own Firebase project with authentication
- Must obtain their own SendLayer API key
- Must manually configure all environment variables and config files
- Follow the complete installation guide

**Internal Developers:**
- Receive access to shared Cloudflare services (no separate setup needed)
- Use pre-configured Firebase authentication and MFA
- Access to shared SendLayer API service
- Receive complete `.env` files and configuration files
- Can skip most installation steps and focus on development

### Commit Guidelines

1. **Commit Frequency**: Commit often with logical, atomic changes
2. **File Limit**: Avoid modifying more than 5 files per commit when possible
3. **Commit Messages**: Use clear, descriptive commit messages following conventional commit format:

```text
type(scope): brief description

Detailed explanation of what changed and why
```

**Commit Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```text
feat(auth): implement multi-factor authentication support

Add MFA functionality with TOTP support and backup codes.
Includes user settings UI and Firebase integration.

fix(canvas): resolve annotation positioning

Fixes issue where touch events were incorrectly calculated
on devices with different pixel densities.
```

## Pull Request Process

### PR Requirements

**For External Contributors:**
1. **Target Repository**: Submit pull requests from your fork to `striae-org/striae`
2. **Cross-Repository PR**: Your fork → `striae-org/striae`
3. **Branch Protection**: Ensure your branch is up-to-date with the target branch

**For Internal Developers:**
1. **Target Repository**: Submit pull requests within `striae-org/striae-dev` (branch → master)
2. **Same-Repository PR**: Your feature branch → `striae-dev` master branch
3. **Direct Access**: Work within the shared development repository

**Both Developer Types:**
- Use the provided PR template and fill out all sections
- Ensure branch is up-to-date before submitting

### Review Process

1. **Mandatory Review**: All pull requests must be reviewed and approved by a project admin before merging
2. **Review Criteria**: Reviews will assess:
   - Code quality and adherence to standards
   - Security implications
   - Performance impact
   - Test coverage
   - Documentation completeness

### Merge Guidelines

1. **Admin Only**: Only project administrators can merge pull requests
2. **Merge Strategy**: Use "Squash and Merge" for feature branches to maintain clean history
3. **Delete Branches**: Feature branches should be deleted after successful merge

### PR Description Requirements

**Required Information:**

- **Summary**: Clear description of what the PR accomplishes
- **Changes Made**: Detailed list of modifications
- **Testing**: Description of testing performed
- **Breaking Changes**: Any breaking changes and migration notes
- **Related Issues**: Link to related issues or discussions
- **Screenshots**: For UI changes, include before/after screenshots
- **Security Impact**: Any security considerations or changes

**PR Description Template:**

```markdown
## Summary
Brief description of the changes and their purpose.

## Changes Made
- [ ] Feature 1: Description
- [ ] Feature 2: Description
- [ ] Bug fix: Description

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests verified
- [ ] Manual testing completed
- [ ] Browser compatibility verified

## Breaking Changes
List any breaking changes and migration steps.

## Security Impact
Describe any security considerations or changes.

## Related Issues
Closes #123
Related to #456

## Screenshots (if applicable)
[Include relevant screenshots]
```

## Code Quality Standards

### Code Style

1. **Formatting**: Use Prettier for consistent code formatting
2. **Linting**: Follow ESLint rules defined in the project
3. **TypeScript**: Maintain strict TypeScript compliance
4. **Comments**: Write clear, meaningful comments for complex logic

### Testing Requirements

1. **Unit Tests**: Write unit tests for new functionality
2. **Integration Tests**: Include integration tests for API endpoints
3. **Coverage**: Maintain or improve code coverage
4. **Test Naming**: Use descriptive test names and organize tests logically

### Documentation

1. **Code Documentation**: Document complex functions and classes
2. **README Updates**: Update relevant README files for new features
3. **API Documentation**: Update API documentation for endpoint changes
4. **Guide Updates**: Update relevant guides in the `/guides` directory

## Component Development Patterns

### Component Architecture

1. **Directory Structure**: Follow established patterns
   ```
   app/components/[feature]/
   ├── component.tsx        # Main component file
   ├── component.module.css # Component-specific styles
   └── index.ts            # Export file (if needed)
   ```

2. **Component Interface Design**:
   ```typescript
   // Always define props interface
   interface ComponentProps {
     // Required props first
     data: DataType;
     onAction: (param: ParamType) => void;
     
     // Optional props with clear defaults
     isVisible?: boolean;
     className?: string;
   }
   
   export const Component = ({ data, onAction, isVisible = true }: ComponentProps) => {
     // Component implementation
   };
   ```

3. **State Management Patterns**:
   - Use `useState` for local component state
   - Use `useContext` for shared state (e.g., AuthContext)
   - Implement custom hooks for reusable logic
   - Follow "Props Down, Events Up" pattern

4. **Integration Requirements**:
   - Canvas components must integrate with existing annotation system
   - Toolbar components must connect to toolbar state management
   - PDF workers must receive consistent data structures
   - All components must support automatic saving workflow

### Type Definition Management

1. **Centralized Types**: Define all interfaces in dedicated type files
   ```typescript
   // types/annotations.ts
   export interface BoxAnnotation {
     id: string;
     x: number;      // Percentage 0-100
     y: number;      // Percentage 0-100
     width: number;  // Percentage 0-100
     height: number; // Percentage 0-100
     color: string;  // Hex color code
   }
   
   export interface AnnotationData {
     // ... existing fields
     boxAnnotations?: BoxAnnotation[];
   }
   ```

2. **Type Import Patterns**:
   ```typescript
   // Import from centralized location
   import type { BoxAnnotation, AnnotationData } from '~/types/annotations';
   
   // Use in component
   interface ComponentProps {
     annotations: BoxAnnotation[];
     data: AnnotationData;
   }
   ```

3. **Type Consistency Requirements**:
   - All annotation-related types must be consistent across frontend and workers
   - PDF worker must use same type definitions for data processing
   - API documentation must reflect actual type definitions
   - Type changes require updates across all consuming components

### Integration Testing Patterns

1. **Component Integration Tests**:
   ```typescript
   // Test component interaction with Canvas system
   describe('BoxAnnotations Integration', () => {
     it('should integrate with Canvas coordinate system', () => {
       // Test percentage-based positioning
     });
     
     it('should trigger automatic save on annotation creation', () => {
       // Test save workflow integration
     });
   });
   ```

2. **API Integration Tests**:
   - Test worker endpoints with actual component data structures
   - Verify PDF generation includes box annotations when expected
   - Test data flow from component through save API to storage

3. **Cross-Component Testing**:
   - Test toolbar state management with annotation components
   - Verify color selector integration with box annotation system
   - Test visibility controls across all annotation types

## Security Considerations

1. **Sensitive Data**: Never commit sensitive data (API keys, passwords, etc.)
2. **Dependencies**: Keep dependencies updated and scan for vulnerabilities
3. **Input Validation**: Validate all user inputs
4. **Authentication**: Follow established authentication patterns
5. **Environment Variables**: Use environment variables for configuration

## Release Management

1. **Versioning Scheme**: Follow the project's versioning format:
   - **Beta Releases**: `v0.#.#-beta` (e.g., `v0.9.06-beta`)
     - First number: Always `0` for beta releases
     - Second number: Month (1-12)
     - Third number: Date (01-31)
   - **Production Releases**: `v#.##.##` (e.g., `v1.01.00`)
     - First number: Major release (breaking changes, major features)
     - Second number: Minor release (new features, enhancements)
     - Third number: Patch release (bug fixes, small improvements)
2. **Release Notes**: Maintain comprehensive release notes for each version
3. **Changelog**: Update `README.md` changelog for each release
4. **Tag Management**: Use proper Git tags matching the version format (`v0.#.#-beta` or `v#.##.##`)
5. **Beta to Production**: Beta versions should be thoroughly tested before removing the `-beta` suffix and promoting version numbers to production releases
6. **Release Immutability**: Once a release is tagged and published, it is immutable and cannot be modified. If issues are discovered, create a new release with an incremented version number

## Issue Management

1. **Issue Templates**: Use provided issue templates
2. **Labels**: Apply appropriate labels to issues
3. **Assignees**: Assign issues to appropriate team members
4. **Milestones**: Associate issues with relevant milestones
5. **Documentation**: Link related documentation and PRs

## Communication Guidelines

1. **Respectful Communication**: Maintain professional and respectful communication
2. **Clear Communication**: Be clear and specific in issue descriptions and comments
3. **Response Time**: Respond to reviews and comments in a timely manner
4. **Code of Conduct**: Follow the project's Code of Conduct at all times

## Additional Best Practices

### Performance Considerations

- Profile performance impact of changes
- Optimize database queries and API calls
- Consider caching strategies for improved performance

### Accessibility

- Ensure UI changes meet accessibility standards
- Test with screen readers and keyboard navigation
- Include proper ARIA labels and semantic HTML

### Error Handling

- Implement comprehensive error handling
- Provide meaningful error messages to users
- Log errors appropriately for debugging

### Monitoring and Observability

- Include appropriate logging for new features
- Consider monitoring and alerting needs
- Document operational procedures for new services

## Enforcement

Failure to follow these protocols may result in:

- PR rejection and request for revision
- Additional review requirements
- Temporary restriction from contributing

## Questions and Support

For questions about these protocols or development practices:

- **GitHub Issues**: [Open an issue](https://github.com/striae-org/striae/issues) with the `question` label
- **Email**: Contact project administrators at [dev@striae.org](mailto:dev@striae.org)
- **Discord**: Contact team members on the [Striae Discord](https://discord.gg/ESUPhTPwHx) #development channel (private)
- **Documentation**: Refer to the project documentation in the `/guides` directory

### Internal Developer Program

If you're interested in becoming an internal developer with direct access to the development infrastructure:

- **Contact**: Stephen at [dev@striae.org](mailto:dev@striae.org)
- **Benefits**: Internal developers receive:
  - **Pre-configured Environment**: Complete `.env` files with all required variables
  - **Cloudflare Access**: Access to shared Cloudflare services (no separate account needed)
  - **Pre-configured Services**: Firebase authentication, MFA, and SendLayer API already set up
  - **Configuration Files**: All `config.json`, `firebase.ts`, and `wrangler.jsonc` files ready to use
  - **Direct Repository Access**: Push access to `striae-org/striae-dev`
  - **Development Environment**: Access to [https://dev.striae.org](https://dev.striae.org) for testing
  - **Enhanced Development Privileges**: Streamlined setup and deployment process
  - **Private Communication Channels**: Access to Discord #development channel
  - **Faster Development Cycle**: Skip complex setup steps and focus on coding

**Internal Developer Workflow:**
1. Clone `striae-org/striae-dev` directly
2. Use provided configuration files
3. Create feature branches within the shared repository
4. Submit pull requests within the same repository
5. Test on the shared development environment

---

*This guide is a living document and will be updated as the project evolves. Contributors are encouraged to suggest improvements to these protocols.*

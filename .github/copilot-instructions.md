# Striae - AI Coding Agent Instructions

## Project Overview
Striae is a cloud-native forensic annotation application for firearms examination, built on Remix + Cloudflare infrastructure with a microservices architecture using Cloudflare Workers.

## Architecture & Service Boundaries
- **Frontend**: Remix app (`app/`) deployed to Cloudflare Pages
- **Backend**: 7 specialized Cloudflare Workers in `workers/` directory:
  - `user-worker`: User management and authentication validation
  - `image-worker`: Image upload/processing via Cloudflare Images
  - `pdf-worker`: PDF generation using Puppeteer
  - `data-worker`: Case and annotation data management (R2 storage)
  - `keys-worker`: API key management and authentication
  - `turnstile-worker`: CAPTCHA and bot protection
  - `audit-worker`: Forensic audit trail logging and compliance tracking
- **Data Layer**: Cloudflare KV (user data), R2 (case data and audit logs), Images (file storage), Firebase Auth (identity)

## Development Workflow & Commands

### Core Development Commands
```bash
npm run dev          # Start local dev with Firebase emulators
npm run build        # Build for production
npm run deploy:all   # Deploy everything (use scripts/deploy-all.sh)
npm run emulators    # Firebase auth emulator only
```

### Worker-Specific Deployment
```bash
npm run deploy-workers:data      # Deploy specific worker
npm run deploy-workers:secrets   # Deploy environment variables
```

### Configuration Management
- **Main config**: `app/config/config.json` (worker URLs, auth keys, feature flags)
- **Firebase config**: `app/config/firebase.ts` with required settings:
  - `apiKey`: Firebase API key from project settings
  - `authDomain`: Firebase auth domain (e.g., `project.firebaseapp.com`)
  - `projectId`: Firebase project ID
  - `appId`: Firebase app ID
  - All values available from Firebase Console → Project Settings → General
- **Worker configs**: `workers/*/wrangler.jsonc` (note: .jsonc format, not .toml!)
  - Configuration is language-specific (JavaScript/TypeScript in JSONC format)
  - Each worker has independent environment variables and secrets
- **Example configs**: `config-example/` - copy and customize for your deployment
- **Import paths**: Vite is configured with `vite-tsconfig-paths` to enable `~/` alias imports
  - This maps `~` to the root `app/` directory for cleaner imports
  - Configured via `tsconfig.json` and `vite.config.ts`

## Code Patterns & Conventions

### Component Architecture
- **Location**: All components in `app/components/[feature]/`
- **Structure**: Each component has its own directory with `.tsx` and `.module.css`
- **Patterns**: 
  - Use TypeScript interfaces for props
  - CSS Modules for styling (not Tailwind for components)
  - Export component as named export, not default

Example component structure:
```tsx
// app/components/toolbar/toolbar.tsx
interface ToolbarProps {
  onToolSelect?: (toolId: ToolId, active: boolean) => void;
}

export const Toolbar = ({ onToolSelect }: ToolbarProps) => {
  // Component logic
};
```

### Mobile Responsiveness Policy
- **Desktop-First Application**: Striae is designed exclusively for desktop environments
- **Limited Mobile Support**: Only the home route (`app/routes/home/`) and marketing pages should include mobile responsive CSS classes
- **No Mobile Classes in App Components**: Components in `app/components/` should NOT include mobile responsive styles or media queries
- **Rationale**: The forensic annotation workflow requires precise cursor control, large screens, and desktop-specific interactions that are not suitable for mobile devices
- **Media Query Usage**: 
  - ✅ **Allowed**: `app/routes/home/`, `app/routes/auth/`, public-facing pages
  - ❌ **Forbidden**: All components in `app/components/`, application workflow pages
  - ❌ **Never Use**: Mobile-first responsive patterns in core application features

### Global CSS & Component Styling
- **Global Button Effects**: Enhanced hover effects are globally applied via `app/styles/root.module.css`
  - All buttons automatically get `transform: translateY(-1px)` on hover
  - Enhanced shadows using `box-shadow: 0 2px 6px color-mix(...)`
  - Opt-out available with `data-no-enhance` attribute
  - **Never duplicate**: Avoid adding `translateY(-1px)` in individual component CSS
- **CSS Modules Pattern**: Use `color-mix(in lab, var(--color) 85%, var(--black))` for hover darkening effects
- **Transitions**: Always use design system timing: `var(--durationS)` with `var(--bezierFastoutSlowin)`

### Text Truncation Standards
- **Character-based truncation**: Use 150 characters as standard limit for descriptions
- **Word boundary preservation**: Always find last space within limit to avoid cutting words
- **Ellipsis character**: Use `…` (Unicode U+2026) instead of `...` for better rendering
- **Implementation pattern**:
  ```typescript
  const truncated = text.substring(0, 150);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 100) truncated = truncated.substring(0, lastSpace);
  return truncated + '…';
  ```

### Mobile Detection & Device Targeting
- **Desktop-only enforcement**: Mobile warning triggers at `max-width: 1024px` to include tablets
- **Multi-method detection**: Combine screen size + user agent detection for comprehensive coverage
- **Target devices**: Discourage phones (0-768px) AND tablets (768px-1024px)
- **User agent patterns**: Check for `/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini|tablet/i`

### Route Organization
- **Pattern**: Feature-based routing in `app/routes/[feature]/`
- **Index routes**: Use `_index.tsx` for route entry points
- **Route imports**: Import components from feature directories, not direct files
```tsx
// app/routes/_index.tsx
import Home, { meta } from './home/home';
export { meta };
export default function App() {
  return <Home />;
}
```

### State Management
- **Auth**: React Context (`app/contexts/auth.context.tsx`) with Firebase Auth
- **Local State**: useState/useEffect with custom hooks in `app/hooks/`

### API Communication
- **Worker URLs**: Defined in `app/config/config.json`
- **CORS**: All workers have strict CORS to `https://www.striae.org`
- **Auth**: Workers use key-based auth + Firebase token validation
- **Error Handling**: Structured error responses with types

### Worker Communication Patterns
- **Inter-Worker Calls**: Use centralized utility functions rather than direct fetch calls
  - Pass worker URL from config into utilities (e.g., `DATA_WORKER_URL`)
  - Include proper authorization headers with both Firebase token and API key
  - Implement exponential backoff retry logic for transient failures
- **Error Handling Between Workers**:
  ```typescript
  // ✅ CORRECT: Independent error handling per worker call
  try {
    const response = await fetch(workerUrl, { /* ... */ });
    if (!response.ok) {
      throw new Error(`Worker error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Worker communication failed:', error);
    throw new WorkerConnectionError('Failed to reach worker service');
  }
  ```
  - Each worker failure should not cascade - catch and handle individually
  - Log failures for audit trail visibility
  - Return meaningful error messages to client
- **Timeout Strategy**: Set reasonable timeouts for worker calls (typically 30-60 seconds)
  - Longer timeouts for batch operations (exports, imports)
  - Shorter timeouts for real-time operations (UI interactions)
- **Resilience Patterns**:
  - Audit-worker failures should not block main operations
  - Data-worker must have retry logic for transient R2 failures
  - Image-worker should queue failed uploads for retry
  - Always fail gracefully when secondary services are unavailable

### Centralized Utility Patterns
- **Always Use Centralized Functions**: Never make direct API calls to workers - use utility functions instead
- **Data Operations** (`app/utils/data-operations.ts`):
  ```tsx
  // ✅ CORRECT: Use centralized functions
  import { getCaseData, updateCaseData, duplicateCaseData } from '~/utils/data-operations';
  const caseData = await getCaseData(user, caseNumber);
  await updateCaseData(user, caseNumber, updatedData);
  
  // ❌ WRONG: Direct worker API calls
  const response = await fetch(`${DATA_WORKER_URL}/${user.uid}/${caseNumber}/data.json`);
  ```
- **Permission Management** (`app/utils/permissions.ts`):
  ```tsx
  // ✅ CORRECT: Use centralized permission functions
  import { canModifyCase, canAccessCase, getUserData, updateUserData } from '~/utils/permissions';
  const accessResult = await canModifyCase(user, caseNumber);
  const userData = await getUserData(user);
  
  // ❌ WRONG: Direct user worker calls or permission bypassing
  const response = await fetch(`${USER_WORKER_URL}/${user.uid}`);
  ```
- **Audit Service** (`app/services/audit.service.ts`):
  ```tsx
  // ✅ CORRECT: Always audit security-sensitive operations
  import { auditService } from '~/services/audit.service';
  await auditService.logCaseCreation(user, caseNumber, caseName);
  await auditService.markEmailVerificationSuccessful(user, reason);
  ```
- **Benefits of Centralized Utilities**:
  - Automatic API key management and session validation
  - Consistent error handling and logging
  - Built-in permission validation (no accidental bypasses)
  - Easier testing and maintenance
  - Single source of truth for business logic

### Development Best Practices
- **CSS Redundancy**: When adding global styles, remove redundant component-level styles to avoid duplication
- **Button Hover Effects**: Never add `transform: translateY(-1px)` to individual components - handled globally
- **Mobile Query Cleanup**: When removing mobile responsiveness, check for leftover disabled button states
- **Type Centralization**: Import types from `~/types` barrel exports, not direct file paths
- **Component Export Pattern**: Use named exports, not default exports for components
- **Centralized Function Creation**: When creating new data operations, always:
  - Add to appropriate utility module (`data-operations.ts`, `permissions.ts`, etc.)
  - Include proper error handling and logging
  - Implement permission validation by default
  - Document parameters and return types
  - Follow existing naming conventions (`getCaseData`, `updateUserData`, etc.)
- **Utility Function Updates**: When modifying centralized functions:
  - Check all call sites for impact
  - Maintain backward compatibility when possible
  - Update TypeScript interfaces if data structures change
  - Add audit logging for new security-sensitive operations

### Security & Access Control Patterns
- **NEVER Bypass Access Validation**: Avoid using `{ validateAccess: false }` without explicit security justification
- **Permission-First Design**: Always check user permissions before performing data operations
- **Case Access Control**:
  ```tsx
  // ✅ CORRECT: Check permissions before case operations
  const accessResult = await canModifyCase(user, caseNumber);
  if (!accessResult.allowed) {
    throw new Error(`Access denied: ${accessResult.reason}`);
  }
  await updateCaseData(user, caseNumber, caseData);
  
  // ❌ WRONG: Bypassing access validation
  await updateCaseData(user, caseNumber, caseData, { validateAccess: false });
  ```
- **Audit Trail Integration**: All security-sensitive operations should log audit events
- **Case Duplication Security**: Always validate destination case permissions during duplication operations

### TypeScript Type Safety Standards
- **No `any` Casting**: Use proper interfaces and type guards instead of `any` type assertions
- **Proper Interface Design**: Create dedicated interfaces instead of repeated inline type intersections
- **Type Guard Pattern**: Use type guard functions for safe property checking
  ```tsx
  // ✅ CORRECT: Type guard for read-only cases
  const isReadOnlyCaseData = (caseData: CaseData): caseData is ReadOnlyCaseData => {
    return 'isReadOnly' in caseData && typeof (caseData as ReadOnlyCaseData).isReadOnly === 'boolean';
  };
  
  // ❌ WRONG: Using any casting
  return !!(caseData as any).isReadOnly;
  ```
- **Extended User Data**: Use `ExtendedUserData` interface instead of `UserData & { readOnlyCases?: ReadOnlyCaseMetadata[] }`
- **Interface Hierarchy**: Extend base interfaces rather than duplicating properties

### Audit & Compliance Patterns
- **Retroactive Audit Events**: When one action implies the success of a prerequisite, log both events
  ```tsx
  // Example: MFA enrollment implies successful email verification
  await auditService.logMfaEnrollment(user, phoneNumber, 'sms', 'success');
  await auditService.markEmailVerificationSuccessful(user, 'MFA enrollment completed');
  ```
- **Comprehensive Logging**: All user actions should be audited with proper context and metadata
- **Error Handling**: Continue operations even if audit logging fails, but log audit failures for monitoring

### CSS Architecture
- **Design System First**: Always use CSS custom properties from design system
- **Theme Token Verification**: ALWAYS verify color tokens exist in `app/components/theme-provider/theme.ts` before using them
  - ✅ Available: `--primary`, `--accent`, `--success`, `--error`, `--errorLight`, `--warning`, `--background`, `--backgroundLight`, `--text`, `--textTitle`, `--textBody`, `--textLight`
  - ❌ DO NOT USE: `--green`, `--red`, `--blue`, `--yellow`, `--orange`, `--purple`, `--gray` (these don't exist)
  - Check both `light` and `dark` theme objects to ensure token exists in both
- **Color Mixing**: Use `color-mix(in lab, ...)` for dynamic color variations
- **Hover States**: Global button effects + component-specific color/background changes only
- **Responsive Patterns**: `@media (max-width: 1024px)` for mobile/tablet detection
- **Shadow Conventions**: Use `color-mix(in lab, var(--color) 30%, transparent)` for shadows

### Confirmation Status Workflows
- **Confirmation Indicators in UI**: Display confirmation status badges on case displays (added in v1.0.5)
  - Cases with confirmation show green checkmark badge
  - Multiple reviewing examiners' confirmations should be aggregated and displayed
  - Use `--success` color token for confirmed states
- **Component Patterns for Confirmation**:
  ```tsx
  // ✅ CORRECT: Show confirmation status with badge
  interface CaseStatusProps {
    isConfirmed: boolean;
    confirmedBy?: string[];
  }
  export const CaseStatus = ({ isConfirmed, confirmedBy }: CaseStatusProps) => (
    <div>
      {isConfirmed && (
        <span className={styles.confirmedBadge}>
          ✓ Confirmed {confirmedBy?.length > 1 && `by ${confirmedBy.length} examiners`}
        </span>
      )}
    </div>
  );
  ```
- **Best Practices**:
  - Always retrieve confirmation status from centralized utility (`getCaseData`)
  - Display confirmation metadata without exposing PII of reviewers
  - Update confirmation indicators when cases are confirmed after initial load
  - Include confirmation status in exports and reports for compliance

## Critical Integration Patterns

### Firebase Auth Integration
```tsx
// Always use the auth context
import { AuthContext } from '~/contexts/auth.context';
const { user, setUser } = useContext(AuthContext);
```

### Worker Communication Example
```tsx
// Standard pattern for calling workers
const response = await fetch(`${config.user_worker_url}/api/user`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
  },
  body: JSON.stringify(userData)
});
```

### PDF Generation Pattern
- PDF worker uses Puppeteer to render HTML templates
- Canvas component exports data via `activeAnnotations` and `annotationData`
- PDF worker receives structured data and generates formatted documents

## Security Requirements
- **Authentication**: Firebase Auth required for all protected routes
- **Worker Auth**: Dual auth (Firebase token + API key from `keys-worker`)
- **CORS**: Strictly configured to production domain
- **Email Validation**: Free email domain filtering via `free-email-domains`
- **Access Control Enforcement**: 
  - All data operations must validate user permissions
  - Case creation/modification requires proper ownership validation
  - Read-only cases have separate access patterns via `ExtendedUserData`
  - Never bypass access validation without documented security justification
- **Permission Validation Patterns**:
  - Use `canModifyCase()` for write operations
  - Use `canAccessCase()` for read operations  
  - Use `canCreateCase()` before case creation
  - Always validate session with `validateUserSession()`
- **Audit Requirements**: Security-sensitive operations must generate audit events

## Testing & Quality

### Test Organization & Structure
- **Unit Tests**: Test individual functions/components in isolation
  - Location: `workers/*/tests/` for worker tests
  - Utilities: Test pure functions, permission checks, data transformations
  - Components: Test props, event handlers, state changes
- **Integration Tests**: Test interaction between components and utilities
  - Mock worker responses with realistic data structures
  - Verify permission-aware operations work end-to-end
  - Test audit logging alongside operations
- **Test Framework**: Vitest for all tests
  - Worker tests run with Vitest
  - Component tests use Vitest + React testing utilities
  - Configure test environment for mock Cloudflare APIs

### Coverage Requirements
- **Utility Modules**: Minimum 80% coverage
  - Data operations: All CRUD operations covered
  - Permission checks: All allowed/denied scenarios covered
  - Error handling: Test both success and failure paths
- **Security-Critical Code**: 100% coverage required
  - Access control functions
  - Audit logging operations
  - Authentication validation
- **Components**: Minimum 60% coverage
  - Critical workflows (case creation, export, confirmation)
  - Error states and edge cases
  - User interactions and state changes

### Test Examples
```typescript
// ✅ Unit test: Permission check
describe('canModifyCase', () => {
  it('allows owner to modify case', async () => {
    const result = await canModifyCase(ownerUser, caseNumber);
    expect(result.allowed).toBe(true);
  });
  
  it('denies non-owner access', async () => {
    const result = await canModifyCase(otherUser, caseNumber);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

// ✅ Integration test: Case creation with audit
it('creates case and logs audit event', async () => {
  const caseData = await createCase(user, caseName);
  
  const auditLog = await getAuditLog(user);
  expect(auditLog).toContainEqual(
    expect.objectContaining({
      action: 'CASE_CREATED',
      caseNumber: caseData.caseNumber
    })
  );
});
```

### Quality Standards
- **Linting**: ESLint with TypeScript rules
  - Run `npm run lint` before commits
  - Fix all linting errors before merge
- **Type Checking**: `npm run typecheck` passes before commits
  - No `any` type usage in production code
  - All external API responses properly typed
- **Development**: Use emulators for Firebase Auth during development
  - Run `npm run emulators` to start Firebase emulator
  - Tests use emulator by default
- **Type Safety Standards**:
  - Eliminate `any` type casting in favor of proper interfaces
  - Create reusable type definitions for repeated patterns
  - Use type guards for runtime type validation
  - Prefer interface extension over intersection types
- **Security Testing**: Validate all access control patterns work correctly
  - Test both authorized and unauthorized scenarios
  - Verify audit events are logged for sensitive operations
  - Test edge cases (expired tokens, concurrent modifications)
- **Code Quality**: No repeated inline type definitions - use proper interfaces

## Error Handling Standards

### Client-Side Error Handling
- **User-Facing Errors**: Display clear, actionable messages without technical jargon
  ```tsx
  // ✅ CORRECT: User-friendly error message
  catch (error) {
    showToast('Unable to save case. Please check your connection and try again.', 'error');
    logger.error('Case save failed:', error);
  }
  
  // ❌ WRONG: Technical error exposed to user
  catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
  ```
- **Error Boundaries**: Wrap critical sections in error boundaries
  - Prevents entire app crash from component failures
  - Log error details for debugging
  - Provide recovery options to user
- **Async Operation Errors**: Always handle promises
  - Show loading state during operation
  - Disable interactions while operation is pending
  - Handle timeout scenarios gracefully

### Worker Error Responses
- **Standard Error Format**: All workers return consistent error structures
  ```json
  {
    "success": false,
    "error": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {"field": "additional context if helpful"}
  }
  ```
- **HTTP Status Codes**: Use appropriate status codes
  - 400: Invalid request data
  - 401: Authentication failed
  - 403: Permission denied
  - 404: Resource not found
  - 409: Conflict (duplicate, version mismatch)
  - 500: Server error
- **Logging**: Log all errors server-side for debugging
  - Include request context (user ID, operation type)
  - Log stack traces for unexpected errors
  - Alert on repeated failures (potential security issue)

### Validation & Input Sanitization
- **Always Validate**: Validate all inputs on both client and server
  - Type checking at runtime
  - Length/format validation for strings
  - Numeric ranges for numbers
- **Sanitization**: Escape user input before displaying or storing
  - Prevent XSS attacks
  - SQL injection prevention in data operations
  - Filename sanitization for file operations

## Accessibility Standards

### WCAG 2.1 Compliance
- **Level AA Compliance**: Target minimum WCAG 2.1 Level AA for all public-facing pages
  - Home, auth routes, and documentation pages must be fully accessible
  - Core application should be Level AA where feasible without compromising forensic workflows
- **Keyboard Navigation**: All functionality accessible via keyboard
  - Tab navigation through all interactive elements
  - Enter/Space to activate buttons
  - Arrow keys for list selection
  - Escape to close modals
- **Color Contrast**: Minimum 4.5:1 contrast ratio for text
  - Verify in both light and dark theme modes
  - Use `color-mix` to ensure sufficient contrast
  - Test with contrast checker tools

### Screen Reader Support
- **Semantic HTML**: Use proper semantic elements
  - `<button>` for buttons, not `<div onclick>`
  - `<label>` for form inputs
  - `<nav>`, `<main>`, `<section>` for page structure
- **ARIA Labels**: Add descriptive labels where semantic HTML is insufficient
  ```tsx
  <button aria-label="Delete case" onClick={deleteCase}>
    {/* Icon button without text */}
  </button>
  ```
- **Announcements**: Use `aria-live` for dynamic content
  ```tsx
  <div aria-live="polite" aria-label="Operation status">
    {statusMessage}
  </div>
  ```

### Forensic-Specific Considerations
- **Precision Requirements**: The detailed canvas work may not be fully accessible to all users
  - Provide keyboard shortcuts for critical tools
  - Offer alternative data entry methods where possible
  - Document accessibility limitations in user guidance
- **Data Export Accessibility**: All exported data must be in accessible formats
  - PDF exports: Tagged PDFs with proper structure
  - CSV exports: Clear column headers and logical order
  - Ensure exported files are screen-reader friendly

## Performance Guidelines

### Bundle Size & Code Splitting
- **Target Sizes**:
  - Main bundle: < 300KB (gzipped)
  - Page bundles: < 100KB each (gzipped)
  - Vendor bundles: < 200KB (gzipped)
- **Code Splitting Strategy**:
  - Split by route/feature using Remix loaders
  - Lazy load heavy components (PDF generation UI, advanced editors)
  - Use dynamic imports for optional features
  ```tsx
  const PdfGenerator = lazy(() => import('~/components/pdf-generator/pdf-generator'));
  ```
- **Tree Shaking**: Remove unused code
  - Mark unused exports
  - Use `sideEffects: false` in package.json for dev dependencies
  - Verify circular dependencies don't prevent tree-shaking

### Caching Strategies
- **Cloudflare KV Caching**:
  - Cache user data with short TTL (5-10 minutes)
  - Cache case metadata separately from large annotation data
  - Implement cache invalidation on data updates
  ```typescript
  const cacheKey = `user:${userId}:data`;
  const cached = await KV.get(cacheKey);
  if (cached) return JSON.parse(cached);
  ```
- **Browser Caching**:
  - Static assets: 1 year with cache busting
  - API responses: `Cache-Control: max-age=300` for mutable data
  - Use ETag headers for conditional requests
- **R2 Caching**:
  - Case data: Cached via Cloudflare CDN
  - Images: Long TTL with cache busting on update

### Performance Monitoring
- **Metrics to Track**:
  - Page load time (target: < 3s)
  - First Contentful Paint (FCP): < 1.5s
  - Time to Interactive (TTI): < 3.5s
  - Case load time: < 2s
  - Annotation operations: < 500ms
- **Monitoring Implementation**:
  - Use Web Vitals library for client-side metrics
  - Log performance data to audit worker for analysis
  - Alert on performance regressions

### Optimization Priorities
1. **Critical Path**: Case loading and annotation operations
2. **User Interactions**: Canvas drawing, annotation editing (< 100ms)
3. **Data Operations**: Exports, imports (can be slower, 5-30s acceptable)
4. **Search/Filter**: Responsive UI even with large datasets (< 500ms)

## Development Environment Setup

### Recommended VS Code Extensions
- **ESLint**: `dbaeumer.vscode-eslint` - Real-time linting
- **TypeScript**: `ms-vscode.vscode-typescript-next` - Latest TypeScript features
- **Prettier**: `esbenp.prettier-vscode` - Code formatting
- **React**: `dsznajder.es7-react-js-snippets` - React snippets
- **Tailwind**: `bradlc.vscode-tailwindcss` - Tailwind class completion
- **CSS Modules**: `clinyong.vscode-css-modules` - CSS Module support
- **Firebase**: `toba.vsfire` - Firebase syntax highlighting

### VS Code Settings
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Firebase Emulator Troubleshooting
- **Port Conflicts**: Emulator uses port 9099
  - Check if port is already in use: `lsof -i :9099`
  - Kill process: `kill -9 <PID>`
  - Or change emulator port in `firebase.json`
- **Data Persistence**: Emulator data stored in `.firebase/emulator_data`
  - Delete folder to reset emulator state
  - Useful for testing from clean slate
- **Slow Emulator**: Check CPU usage
  - Node.js emulator process may be slow on low-end hardware
  - Consider using remote dev environment if local too slow

### Common Development Issues
- **Module Not Found**: Check import paths
  - Verify `~/` alias is resolving correctly
  - Use absolute paths from `app/` if `~/` fails
- **Build Errors**: Clear cache
  - Delete `.vite/` and `build/` directories
  - Run `npm install` to refresh dependencies
- **TypeScript Errors**: Restart TypeScript server
  - In VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
  - May fix stale type information
- **Worker Deployment Failures**: Check secrets
  - Run `npm run deploy-worker-secrets` before deploying workers
  - Verify all environment variables are set

## Deployment & Infrastructure
- **Pages**: Frontend deploys to Cloudflare Pages via `wrangler pages deploy`
- **Workers**: Each worker deploys independently with own `wrangler.jsonc`
- **Secrets**: Managed via `scripts/deploy-env.sh` and `scripts/deploy-pages-secrets.sh`
- **Environment**: Use `scripts/deploy-all.sh` for complete deployment

## Documentation References
- Architecture details: `guides/ARCHITECTURE.md`
- Development workflow: `guides/DEVELOPMENT_PROTOCOL.md`
- Component patterns: `guides/COMPONENT_GUIDE.md`
- Full API reference: `guides/API_REFERENCE.md`

## Key Type Definitions
- **ExtendedUserData**: `app/types/user.ts` - User data with read-only cases
- **ReadOnlyCaseData**: `app/types/case.ts` - Case data with read-only flag
- **UserProfileAuditDetails**: `app/types/audit.ts` - Audit details with retroactive fields
- **PermissionResult**: `app/utils/permissions.ts` - Standard permission check result
- **DataOperationOptions**: `app/utils/data-operations.ts` - Options for data operations

## Utility Modules Reference

### Data Operations (`app/utils/data-operations.ts`)
**Core Functions**:
- `getCaseData(user, caseNumber, options?)` - Get case with access validation
- `updateCaseData(user, caseNumber, data, options?)` - Update case with permissions
- `deleteCaseData(user, caseNumber)` - Delete case with audit logging
- `duplicateCaseData(user, fromCase, toCase)` - Duplicate with security validation
- `getFileAnnotations(user, caseNumber, fileId)` - Get file annotations safely

**Key Features**: Automatic API key management, session validation, permission checks, structured error handling

### Permission Management (`app/utils/permissions.ts`)
**Core Functions**:
- `getUserData(user)` - Get user data with caching
- `updateUserData(user, updates)` - Update with session validation
- `canModifyCase(user, caseNumber)` - Check write permissions
- `canAccessCase(user, caseNumber)` - Check read permissions  
- `canCreateCase(user)` - Validate case creation limits
- `validateUserSession(user)` - Session and token validation
- `getUserReadOnlyCases(user)` - Get read-only cases safely

**Key Features**: Built-in access control, session validation, consistent error responses, ExtendedUserData handling

### Audit Service (`app/services/audit.service.ts`)
**Core Functions**:
- `logCaseCreation(user, caseNumber, caseName)` - Case creation events
- `logMfaEnrollment(user, phone, method, result)` - MFA events
- `markEmailVerificationSuccessful(user, reason)` - Retroactive verification
- `logSecurityViolation(user, incident, severity)` - Security events
- `logUserLogin(user, sessionId, method)` - Authentication events

**Key Features**: Comprehensive audit trails, retroactive event logging, security incident tracking, performance metrics

## Key File Locations
- Canvas logic: `app/components/canvas/canvas.tsx`
- Main layout: `app/root.tsx`
- Auth setup: `app/services/firebase.ts`
- Worker examples: `workers/pdf-worker/src/pdf-worker.js`
- Deployment scripts: `scripts/deploy-*.sh`
- Permission utilities: `app/utils/permissions.ts`
- Data operations: `app/utils/data-operations.ts`
- Audit service: `app/services/audit.service.ts`
- Type definitions: `app/types/` (barrel exports via `index.ts`)

## Version Update Protocol

### Co-Pilot Command

Please bump to version v{VERSION}. Create release notes and update README changelog. Use the commits done since the previous release (non-merge).

### Release Notes Creation
- **File Location**: `public/release-notes/RELEASE_NOTES_v{VERSION}.md`
- **Naming Convention**: RELEASE_NOTES_v1.0.5.md (note: hyphen in filename)
- **Template Structure**:
  ```markdown
  # Striae Release Notes - v{VERSION}
  
  **Release Date**: MonthName DD, YYYY
  **Period**: StartDate - EndDate
  **Total Commits**: X (Category1, Category2, etc.)
  
  ## 🎉 {Release Type} - {Tagline}
  ```
- **Content Organization**:
  1. Summary section with emoji-labeled key features
  2. Detailed Changes section with subsections (Features, Bug Fixes, etc.)
  3. Key Fix Summary table
  4. Technical Implementation Details
  5. Closing note

### Version Format
- **Semantic Versioning**: MAJOR.MINOR.PATCH
  - MAJOR: Breaking changes
  - MINOR: New features (backward compatible)
  - PATCH: Bug fixes and minor improvements
- **Pre-release Suffixes**: -beta, -rc for pre-release versions

### Changelog Updates
- **File**: `.github/README.md`
- **Format**: Add new entry at the top under "📋 Changelog" section
- **Pattern**: `## [YYYY-MM-DD] - *[Release Type v{VERSION}](GitHub release URL)*`
- **Existing Order**: Keep previous versions in reverse chronological order

### Version References
- Update `version` field in `package.json`
- Update version in:
  - Project Overview section: "Striae v{VERSION}..."
  - SECURITY file if it lists version info
  - Any deployment documentation
- Search for outdated version strings in documentation

### Sitemap Update (Manual)
- **Location**: `public/_routes.json` (dynamic routing config)
- **Note**: With dynamic sitemap generation (v1.0.5+), manual updates typically not required
- **Exception**: If adding new static routes or major documentation sections, update routing

### Pre-Release Verification
- Run `npm install` to update dependencies if needed
- Run `npm run build` to verify production build succeeds
- Run `npm run typecheck` to verify TypeScript compliance
- Run `npm run lint` to verify code quality
- Test key workflows affected by changes

### Maintenance Process
- **Frequency**: Review this instruction file quarterly
- **Update Triggers**: When new patterns emerge, add them here
- **Archive**: Keep version history comments in this file for reference
- **Owner**: Maintained as part of project documentation standards
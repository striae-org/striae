# Striae - AI Coding Agent Instructions

## Project Overview
Striae is a cloud-native forensic annotation application for firearms examination, built on Remix + Cloudflare infrastructure with a microservices architecture using Cloudflare Workers.

## Architecture & Service Boundaries
- **Frontend**: Remix app (`app/`) deployed to Cloudflare Pages
- **Backend**: 6 specialized Cloudflare Workers in `workers/` directory:
  - `user-worker`: User management and authentication validation
  - `image-worker`: Image upload/processing via Cloudflare Images
  - `pdf-worker`: PDF generation using Puppeteer
  - `data-worker`: Case and annotation data management (R2 storage)
  - `keys-worker`: API key management and authentication
  - `turnstile-worker`: CAPTCHA and bot protection
- **Data Layer**: Cloudflare KV (user data), R2 (case data), Images (file storage), Firebase Auth (identity)

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
- Main config: `app/config/config.json` (worker URLs, auth keys)
- Firebase config: `app/config/firebase.ts`
- Worker configs: `workers/*/wrangler.jsonc` (not .toml!)
- Example configs in `config-example/` - copy and customize

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

### Development Best Practices
- **CSS Redundancy**: When adding global styles, remove redundant component-level styles to avoid duplication
- **Button Hover Effects**: Never add `transform: translateY(-1px)` to individual components - handled globally
- **Mobile Query Cleanup**: When removing mobile responsiveness, check for leftover disabled button states
- **Type Centralization**: Import types from `~/types` barrel exports, not direct file paths
- **Component Export Pattern**: Use named exports, not default exports for components

### CSS Architecture
- **Design System First**: Always use CSS custom properties from design system
- **Color Mixing**: Use `color-mix(in lab, ...)` for dynamic color variations
- **Hover States**: Global button effects + component-specific color/background changes only
- **Responsive Patterns**: `@media (max-width: 1024px)` for mobile/tablet detection
- **Shadow Conventions**: Use `color-mix(in lab, var(--color) 30%, transparent)` for shadows

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

## Testing & Quality
- **Linting**: ESLint with TypeScript rules
- **Type Checking**: `npm run typecheck` before commits
- **Worker Testing**: Vitest setup in each worker directory
- **Development**: Use emulators for Firebase Auth during development

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

## Key File Locations
- Canvas logic: `app/components/canvas/canvas.tsx`
- Main layout: `app/root.tsx`
- Auth setup: `app/services/firebase.ts`
- Worker examples: `workers/pdf-worker/src/pdf-worker.js`
- Deployment scripts: `scripts/deploy-*.sh`
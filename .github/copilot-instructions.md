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
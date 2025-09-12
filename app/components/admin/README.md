# Admin Dashboard Integration Setup

## Overview
This component integrates with the Infinity admin dashboard to automatically create user entries when new users register in Striae.

## Setup Instructions

### 1. Add Admin API Token to Keys Worker

The Infinity admin API token needs to be added to your keys worker. Follow these steps:

1. **Add the token to your keys worker environment**:
   - Add `INFINITY_ADMIN_TOKEN` as a new secret in your keys worker
   - Set the value to your actual Infinity API token

2. **Update the keys worker to handle the new token type**:
   The `auth.ts` utility has already been updated to include `INFINITY_ADMIN_TOKEN` as a valid key type.

### 2. Verify Attribute IDs

The attribute IDs in `create-user.ts` need to match your Infinity workspace:

```typescript
const INFINITY_ATTRIBUTE_IDS = {
  FIRST_NAME: '169f48aa-5a55-4d22-940c-89ea57b3beef',
  LAST_NAME: '7f8aa702-134f-470b-8c13-2130327c643c',
  EMAIL: 'e806808d-9e6e-42c8-b7af-658e4749ecc3',
  LAB_COMPANY: '40b2619b-9312-442c-86f2-67b244888cbe',
  CREATED_DATE: 'eb6c1847-642a-4686-963b-1e93cb1d768c',
  UID: 'bf285694-93d2-4249-b40b-68d9dd816858'
}
```

**To verify these IDs**:
1. Go to your Infinity workspace
2. Check the board structure and note the actual attribute IDs
3. Update the `INFINITY_ATTRIBUTE_IDS` object accordingly

### 3. Integration Points

The admin dashboard integration is automatically called during user registration in `app/routes/auth/login.tsx`:

- **When**: After successful user creation in KV database
- **What**: Creates corresponding entry in Infinity admin dashboard
- **Error Handling**: Graceful degradation - registration continues even if admin dashboard fails

## Testing

### 1. Test User Registration
1. Start the development environment: `npm run dev`
2. Register a new user through the normal registration flow
3. Check console logs for success/error messages
4. Verify entry appears in Infinity admin dashboard

### 2. Manual Testing
You can test the admin dashboard integration separately:

```typescript
import { registerUserInAdminDashboard } from '~/components/admin/create-user';

// Test with mock data
const testUser = {
  uid: 'test-uid-123',
  email: 'test@example.com'
};

const result = await registerUserInAdminDashboard(
  testUser,
  'John',
  'Doe',
  'Test Lab'
);

console.log('Result:', result);
```

## Error Handling

The integration includes comprehensive error handling:

- **Network errors**: Caught and logged without breaking registration
- **API errors**: Detailed error messages for debugging
- **Missing configuration**: Clear error messages for setup issues

## Security Notes

- The admin API token is stored securely in the keys worker
- API calls use proper authentication headers
- All data is validated before sending to Infinity

## Configuration

Update `INFINITY_CONFIG` in `create-user.ts` if your workspace details change:

```typescript
const INFINITY_CONFIG = {
  API_URL: 'https://admin.striae.org/api/v2/workspaces/Wm4J6dTmNuj/boards/Gz2boYV4VmL/items',
  FOLDER_ID: 'Wm4J6dTmNuj',
  API_VERSION: '2025-02-26.morava'
}
```

## Monitoring

Monitor the integration through:
- Browser console logs during registration
- Keys worker logs for API token retrieval
- Infinity dashboard for successful entries
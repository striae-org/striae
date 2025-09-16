# Striae Architecture Guide

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Frontend Architecture](#frontend-architecture)
   - [Technology Stack](#technology-stack)
   - [Key Frontend Components](#key-frontend-components)
     - [1. Authentication System](#1-authentication-system)
     - [2. Canvas System](#2-canvas-system)
     - [3. Sidebar Management](#3-sidebar-management)
     - [4. PDF Generation](#4-pdf-generation)
4. [Backend Architecture (Cloudflare Workers)](#backend-architecture-cloudflare-workers)
   - [Worker Services Overview](#worker-services-overview)
   - [1. User Worker (`workers/user-worker/`)](#1-user-worker-workersuser-worker)
   - [2. Image Worker (`workers/image-worker/`)](#2-image-worker-workersimage-worker)
   - [3. PDF Worker (`workers/pdf-worker/`)](#3-pdf-worker-workerspdf-worker)
   - [4. Data Worker (`workers/data-worker/`)](#4-data-worker-workersdata-worker)
   - [5. Keys Worker (`workers/keys-worker/`)](#5-keys-worker-workerskeys-worker)
   - [6. Turnstile Worker (`workers/turnstile-worker/`)](#6-turnstile-worker-workersturnstile-worker)
5. [Data Architecture](#data-architecture)
   - [Storage Systems](#storage-systems)
     - [1. Cloudflare KV (User Data Store)](#1-cloudflare-kv-user-data-store)
     - [2. Cloudflare R2 (Case and Annotation Data Store)](#2-cloudflare-r2-case-and-annotation-data-store)
     - [3. Cloudflare Images (File Storage)](#3-cloudflare-images-file-storage)
     - [4. Firebase Authentication (Identity Provider)](#4-firebase-authentication-identity-provider)
6. [Security Architecture](#security-architecture)
   - [Authentication Flow](#authentication-flow)
   - [Security Measures](#security-measures)
     - [1. Multi-layered Authentication](#1-multi-layered-authentication)
     - [2. Data Protection](#2-data-protection)
     - [3. Access Controls](#3-access-controls)
   - [CORS Configuration](#cors-configuration)
7. [Performance Architecture](#performance-architecture)
   - [Edge Computing Benefits](#edge-computing-benefits)
   - [Optimization Strategies](#optimization-strategies)
     - [1. Frontend Optimizations](#1-frontend-optimizations)
     - [2. Backend Optimizations](#2-backend-optimizations)
8. [Scalability Considerations](#scalability-considerations)
   - [Horizontal Scaling](#horizontal-scaling)
   - [Data Partitioning](#data-partitioning)
9. [Monitoring and Observability](#monitoring-and-observability)
   - [Built-in Monitoring](#built-in-monitoring)
   - [Custom Logging](#custom-logging)
10. [Development Architecture](#development-architecture)
    - [Development Environment](#development-environment)
    - [CI/CD Pipeline](#cicd-pipeline)
11. [Future Architecture Considerations](#future-architecture-considerations)
    - [Custom Features](#custom-features)

## System Architecture Overview

Striae follows a modern cloud-native architecture built on Cloudflare's edge computing platform. The system is designed as a collection of microservices that work together to provide a comprehensive forensic annotation platform.

## High-Level Architecture

```
    FRONTEND                 BACKEND                EXTERNAL
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │    │  Cloudflare      │    │   External      │
│   (Remix/React) │────│  Workers & Pages │────│   Services      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐      ┌───────────▼───────────┐      ┌────▼────┐
    │Firebase │      │   KV   │  R2   │ CF   │      │SendLayer│
    │  Auth   │      │Storage │Storage│Images│      │  Email  │
    └─────────┘      └────────┴───────┴──────┘      └─────────┘
```

## Frontend Architecture

### Technology Stack

- **Framework**: Remix (React-based full-stack framework)
- **Styling**: CSS Modules + Tailwind CSS
- **Type Safety**: TypeScript
- **Build Tool**: Vite
- **Deployment**: Cloudflare Pages

### Key Frontend Components

#### 1. Authentication System
- **Location**: `app/routes/auth/`
- **Components**: Login/Registration, MFA
- **Features**: 
  - Firebase Authentication integration
  - Multi-factor authentication support
  - Email verification
  - Password reset functionality

#### 2. Canvas System
- **Location**: `app/components/canvas/`
- **Purpose**: Forensic image annotation
- **Features**:
  - High-resolution image display
  - Dynamic annotation overlay
  - Annotation state management
  - Interactive box annotation drawing system
  - Percentage-based coordinate system for device independence
  - Real-time visual feedback during annotation creation
- **Components**:
  - **Canvas**: Main image display and annotation overlay
  - **BoxAnnotations**: Interactive box drawing and management
  - **ToolbarColorSelector**: Dynamic color selection interface
- **Architecture**:
  - **Data Flow**: Canvas → BoxAnnotations → AnnotationData → Automatic Save
  - **Type Safety**: Centralized BoxAnnotation and AnnotationData interfaces
  - **Integration**: Seamless connection with toolbar controls and PDF generation

#### 3. Sidebar Management
- **Location**: `app/components/sidebar/`
- **Features**:
  - Case and file management
  - Image selection
  - Annotation inputs
  - Visibility controls

#### 4. PDF Generation
- **Location**: `app/components/actions/`
- **Purpose**: Report generation
- **Features**:
  - Dynamic PDF creation
  - Annotation integration
  - Custom formatting

## Backend Architecture (Cloudflare Workers)

### Worker Services Overview

The backend consists of six specialized Cloudflare Workers, each handling specific functionality:

#### 1. User Worker (`workers/user-worker/`)

**Purpose**: User data management and authentication

**Responsibilities**:
- User profile CRUD operations
- Case listing management
- Data synchronization with Firebase Auth

**API Endpoints**:
- `GET /{userUid}` - Retrieve user data
- `PUT /{userUid}` - Create/update user
- `DELETE /{userUid}` - Delete user
- `PUT /{userUid}/cases` - Add cases to user
- `DELETE /{userUid}/cases` - Remove cases from user

**Key Features**:
- CORS protection for striae.org domain
- Custom authentication via X-Custom-Auth-Key header
- User data validation and sanitization
- Case deduplication logic

#### 2. Image Worker (`workers/image-worker/`)

**Purpose**: Image upload and management

**Responsibilities**:
- Image upload to Cloudflare Images
- Signed URL generation for secure access
- Image metadata management
- File validation and processing

**API Endpoints**:
- `POST /` - Upload new image
- `GET /{imageDeliveryPath}` - Generate signed URL for imagedelivery.net path
- `DELETE /{imageId}` - Delete image

**Key Features**:
- Bearer token authentication
- Automatic signed URL requirement for security
- Image format validation
- Error handling for upload failures

#### 3. PDF Worker (`workers/pdf-worker/`)

**Purpose**: PDF report generation

**Responsibilities**:
- Dynamic PDF document creation
- Annotation data integration
- Custom formatting and styling
- Report template management

**Technology**: Puppeteer for PDF generation

**API Endpoints**:
- `POST /` - Generate PDF report

**Key Features**:
- HTML to PDF conversion
- Annotation overlay rendering
- Box annotation rendering with exact positioning and styling
- Custom branding and headers
- Date and metadata integration
- Conditional annotation display based on toolbar state
- Type-safe data processing with centralized interfaces
- No authentication required

#### 4. Data Worker (`workers/data-worker/`)

**Purpose**: JSON file data management

**Responsibilities**:
- JSON file storage and retrieval
- File-based data operations
- Data validation for JSON format
- R2 bucket file management

**Storage**: Cloudflare R2 (STRIAE_DATA bucket)

**API Endpoints**:
- `GET /{filename}.json` - Retrieve JSON file data
- `PUT /{filename}.json` - Create/update JSON file
- `DELETE /{filename}.json` - Delete JSON file

**Key Features**:
- JSON file validation
- R2 bucket storage for file persistence
- Custom authentication via X-Custom-Auth-Key header
- Returns empty array for non-existent files

#### 5. Keys Worker (`workers/keys-worker/`)

**Purpose**: API key management and authentication

**Responsibilities**:
- API key retrieval and validation
- Access token management
- Authentication middleware
- Security policy enforcement

**API Endpoints**:
- `GET /{keyName}` - Retrieve environment variable value by name

**Key Features**:
- Secure key distribution for other workers
- Custom authentication via X-Custom-Auth-Key header

#### 6. Turnstile Worker (`workers/turnstile-worker/`)

**Purpose**: CAPTCHA verification

**Responsibilities**:
- Cloudflare Turnstile integration
- Bot protection
- Form submission validation
- Abuse prevention

**API Endpoints**:
- `POST /` - Verify Cloudflare Turnstile token

**Key Features**:
- No authentication required
- Token validation with Cloudflare Turnstile service
- IP address logging for verification
- JSON response with verification results

## Data Architecture

### Storage Systems

#### 1. Cloudflare KV (User Data Store)

**Namespaces**:
- `USER_DB` - User profiles and metadata

**Data Structure**:

```typescript
// User Data (KV Storage)
interface UserData {
  uid: string;
  email: string | null;
  firstName: string;
  lastName: string;
  company: string;
  permitted: boolean;
  cases: CaseReference[];
  createdAt: string;
  updatedAt?: string;
}

// Case Reference (nested in UserData)
interface CaseReference {
  caseNumber: string;
  createdAt: string;
}
```

#### 2. Cloudflare R2 (Case and Annotation Data Store)

**Buckets**:
- `striae-data` - Case files and annotation data

**Data Structure**:

```typescript
// Case Data (R2 Storage)
interface CaseData {
  caseNumber: string;
  files: FileData[];
  createdAt: string;
  updatedAt?: string;
}

// File Data (nested in CaseData)
interface FileData {
  id: string;
  originalFilename: string;
  uploadedAt: string;
}

// Annotation Data (R2 Storage)
interface AnnotationData {
  leftCase: string;
  rightCase: string;
  leftItem: string;
  rightItem: string;
  caseFontColor: string;
  classType: 'Bullet' | 'Cartridge Case' | 'Other';
  customClass?: string;
  classNote: string;
  indexType: 'number' | 'color';
  indexNumber?: string;
  indexColor?: string;
  supportLevel: 'ID' | 'Exclusion' | 'Inconclusive';
  hasSubclass?: boolean;
  includeConfirmation: boolean;
  additionalNotes: string;
  updatedAt?: string;
}
```

#### 3. Cloudflare Images (File Storage)

**Purpose**: High-performance image storage and delivery

**Features**:
- Global CDN distribution
- Automatic image optimization
- Signed URL security
- Metadata preservation (if enabled)

#### 4. Firebase Authentication (Identity Provider)

**Purpose**: User authentication and identity management

**Features**:
- Email/password authentication
- Multi-factor authentication
- Email verification
- Session management

## Security Architecture

### Authentication Flow

1. **User Login**: Firebase Authentication validates credentials
2. **Token Generation**: Firebase provides JWT tokens
3. **API Key Retrieval**: Keys Worker retrieves API keys for Worker authentication
4. **Request Authorization**: Each Worker validates requests using custom auth headers

### Security Measures

#### 1. Multi-layered Authentication
- Firebase JWT tokens for client authentication
- Custom API keys for Worker-to-Worker communication
- CORS policies restricting access to striae.org domain

#### 2. Data Protection
- All data transmission over HTTPS/TLS
- Signed URLs for image access
- No plaintext storage of sensitive data
- AES-256 encryption for stored data

#### 3. Access Controls
- Role-based permissions (not yet implemented)
- User data segregation
- Audit logging for data access
- Rate limiting and abuse prevention

### CORS Configuration

All workers implement strict CORS policies:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.striae.org',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};
```

## Performance Architecture

### Edge Computing Benefits

- **Global Distribution**: Cloudflare's edge network ensures low latency worldwide
- **Caching**: Intelligent caching for static assets and API responses
- **Load Balancing**: Automatic traffic distribution across edge locations
- **DDoS Protection**: Built-in protection against attacks

### Optimization Strategies

#### 1. Frontend Optimizations
- Code splitting with Remix
- Image optimization with Cloudflare Images
- CSS optimization with Tailwind CSS
- TypeScript for development efficiency

#### 2. Backend Optimizations
- Lightweight Workers with minimal cold start time
- Efficient KV/R2 operations with proper key design
- Request deduplication and caching
- Optimized PDF generation with Puppeteer

## Scalability Considerations

### Horizontal Scaling
- Workers automatically scale with demand
- KV/R2 storage scales independently
- Edge locations distribute load globally

### Data Partitioning
- User data partitioned by UID
- Case data organized by case number
- Annotations linked to specific cases and image IDs

## Monitoring and Observability

### Built-in Monitoring
- Cloudflare Analytics for traffic and performance
- Worker execution metrics
- Error tracking and logging
- Firebase Authentication analytics

### Custom Logging
- Structured logging in Workers
- Error aggregation and reporting
- Performance metric collection
- User activity tracking

## Development Architecture

### Development Environment
- Local development with Wrangler CLI
- Hot reloading with Vite
- TypeScript compilation

### CI/CD Pipeline
- Git-based deployment
- Automated testing
- Environment-specific configurations
- Rollback capabilities

## Future Architecture Considerations

### Custom Features
- Role-based access control and operations
- Agency-based report formatting

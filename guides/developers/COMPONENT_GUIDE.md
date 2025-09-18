# Striae Component Guide

## Table of Contents

1. [Component Architecture Overview](#component-architecture-overview)
2. [Component Directory Structure](#component-directory-structure)
3. [Core Components](#core-components)
   - [1. Authentication Components](#1-authentication-components)
     - [MFAEnrollment](#mfaenrollment-appcomponentsauthmfa-enrollmenttsx)
     - [MFAVerification](#mfaverification-appcomponentsauthmfa-verificationtsx)
   - [2. Canvas System](#2-canvas-system)
     - [Canvas](#canvas-appcomponentscanvascanvastsx)
     - [Box Annotations](#box-annotations-appcomponentscanvasbox-annotationstsx)
     - [ToolbarColorSelector](#toolbarcolorselector-appcomponentstoolbartoolbar-color-selectortsx)
   - [3. Sidebar System](#3-sidebar-system)
     - [Sidebar Container](#sidebar-container-appcomponentssidebarsidebar-containertsx)
     - [Sidebar](#sidebar-appcomponentssidebarsidebartsx)
     - [Case Sidebar](#case-sidebar-appcomponentssidebarcase-sidebartsx)
     - [Notes Sidebar](#notes-sidebar-appcomponentssidebarnotes-sidebartsx)
     - [Cases Modal](#cases-modal-appcomponentssidebarcases-modaltsx)
     - [Notes Modal](#notes-modal-appcomponentssidebarnotes-modaltsx)
     - [Case Export](#case-export-appcomponentssidebarcase-exportcase-exporttsx)
   - [4. Action Components](#4-action-components)
     - [Case Management](#case-management-appcomponentsactionscase-managets)
     - [Case Export](#case-export-appcomponentsactionscase-exportts)
     - [Image Management](#image-management-appcomponentsactionsimage-managets)
     - [PDF Generation](#pdf-generation-appcomponentsactionsgenerate-pdfts)
     - [Notes Management](#notes-management-appcomponentsactionsnotes-managets)
     - [Sign Out](#sign-out-appcomponentsactionssignouttsx)
   - [5. UI Components](#5-ui-components)
     - [Button System](#button-system-appcomponentsbutton)
     - [Color System](#color-system-appcomponentscolorscolorstsx)
     - [Footer Component](#footer-component-appcomponentsfooterfootertsx)
     - [Icon System](#icon-system-appcomponentsiconicontsx)
     - [Mobile Warning](#mobile-warning-appcomponentsmobilemobile-warningtsx)
     - [Notice System](#notice-system-appcomponentsnoticenoticetsx)
     - [Toast System](#toast-system-appcomponentstoasttoasttsx)
     - [Toolbar](#toolbar-appcomponentstoolbartoolbartsx)
     - [Turnstile CAPTCHA](#turnstile-captcha-appcomponentsturnstileturnstiletsx)
     - [Theme Provider](#theme-provider-appcomponentstheme-providertheme-providertsx)
   - [6. User Management Components](#6-user-management-components)
     - [User Profile Management](#user-profile-management-appcomponentsusermanage-profiletsx)
     - [Delete Account](#delete-account-appcomponentsuserdelete-accounttsx)
     - [Inactivity Warning](#inactivity-warning-appcomponentsuserinactivity-warningtsx)
4. [Component State Management](#component-state-management)
   - [Local State Patterns](#local-state-patterns)
   - [Context Usage](#context-usage)
     - [AuthContext](#authcontext-appcontextsauthcontextts)
   - [Custom Hooks](#custom-hooks)
     - [useInactivityTimeout](#useinactivitytimeout-apphooksuseinactivitytimeoutts)
5. [Component Communication Patterns](#component-communication-patterns)
   - [Props Down, Events Up](#props-down-events-up)
   - [Event Handling](#event-handling)
   - [Modal and Dialog Patterns](#modal-and-dialog-patterns)
6. [Styling Approach](#styling-approach)
   - [CSS Modules](#css-modules)
   - [Style Conventions](#style-conventions)
7. [Performance Considerations](#performance-considerations)
   - [Component Lifecycle](#component-lifecycle)
8. [Accessibility Features](#accessibility-features)
   - [Built-in Accessibility](#built-in-accessibility)
9. [Development Guidelines](#development-guidelines)
   - [Component Creation Checklist](#component-creation-checklist)
   - [Best Practices](#best-practices)

## Component Architecture Overview

Striae's frontend is built using React components organized in a modular structure. This guide covers the major components, their purposes, and how they interact within the application.

## Component Directory Structure

```text
app/components/
├── actions/          # Data handling components
├── auth/             # Authentication components
├── button/           # Reusable button components
├── canvas/           # Main canvas for image annotation
├── colors/           # Color picker components
├── footer/           # Footer and modal components
├── icon/             # Icon system
├── mobile/           # Mobile-specific components
├── notice/           # Notification and modal components
├── sidebar/          # Sidebar navigation and controls
├── theme-provider/   # Theme management
├── toast/            # Toast notification system
├── toolbar/          # Main toolbar components
├── turnstile/        # CAPTCHA components
└── user/             # User management components
```

## Core Components

### 1. Authentication Components

#### MFAEnrollment (`app/components/auth/mfa-enrollment.tsx`)

**Purpose**: Multi-factor authentication setup

**Features**:

- Phone number verification
- SMS code validation
- Firebase MFA integration
- reCAPTCHA verification

**Type Definition**: Uses Firebase authentication types for MFA setup

**Key Props**:

- `user: User` - Firebase user object
- `onSuccess: () => void` - Success callback
- `onError: (message: string) => void` - Error callback
- `mandatory: boolean` - Whether MFA is required

#### MFAVerification (`app/components/auth/mfa-verification.tsx`)

**Purpose**: MFA challenge during login

**Features**:

- Multi-factor resolver handling
- SMS code input and validation
- Error handling and retry logic

**Type Definition**: Uses Firebase `MultiFactorResolver` interface for MFA challenges

### 2. Canvas System

#### Canvas (`app/components/canvas/canvas.tsx`)

**Purpose**: Main image display and annotation interface

**Features**:

- High-resolution image rendering
- Annotation overlay display
- Loading states and error handling
- Flash effects for user feedback (subclass characteristics)

**Type Definition**: Uses `AnnotationData` interface from `app/types/annotations.ts`

**Key Props**:

```typescript
interface CanvasProps {
  imageUrl?: string;
  filename?: string;
  company?: string;
  firstName?: string;
  error?: string;
  activeAnnotations?: Set<string>;
  annotationData?: AnnotationData | null;
}
```

**State Management**:

- Image loading states
- Error handling for network issues
- Flash effects for user feedback (subclass characteristics)

**Key Methods**:

- Image load error detection
- Annotation overlay rendering
- User interaction handling

#### Box Annotations (`app/components/canvas/box-annotations.tsx`)

**Purpose**: Interactive box annotation drawing and management system

**Features**:

- Mouse-based box drawing with real-time visual feedback
- Percentage-based coordinate system for device independence
- Double-click and right-click removal functionality
- Hover effects with deletion indicators
- Transparent styling with colored borders
- Automatic saving integration with existing annotation system

**Type Definition**: Uses `BoxAnnotation` interface from `app/types/annotations.ts`

**Key Props**:

```typescript
interface BoxAnnotationsProps {
  imageRef: React.RefObject<HTMLImageElement>;
  activeAnnotations?: Set<string>;
  annotationData?: AnnotationData | null;
  onSave: (data: AnnotationData) => void;
  selectedColor: string;
  isBoxAnnotationMode: boolean;
}
```

**State Management**:

- Drawing state tracking (isDrawing, startPosition, currentBox)
- Box annotation array management
- Real-time coordinate calculation and display
- Integration with toolbar visibility controls

**Key Methods**:

- `handleMouseDown`: Initiates box drawing on mouse press
- `handleMouseMove`: Updates current box dimensions during drawing
- `handleMouseUp`: Finalizes box creation and triggers save
- `handleDoubleClick` / `handleRightClick`: Box removal functionality
- `calculatePercentageCoordinates`: Converts pixel coordinates to percentages

#### ToolbarColorSelector (`app/components/toolbar/toolbar-color-selector.tsx`)

**Purpose**: Dynamic color selection interface for box annotations

**Features**:

- Preset color grid with common annotation colors
- Custom color wheel for precise color selection
- Confirm/cancel workflow with visual preview
- Automatic appearance when box annotation tool is active
- Reset functionality to restore previous color selection

**Type Definition**: Uses component-specific `ToolbarColorSelectorProps` interface

**Key Props**:

```typescript
interface ToolbarColorSelectorProps {
  isVisible: boolean;
  selectedColor: string;
  onColorSelect: (color: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**State Management**:

- Temporary color selection state
- Preset color array management
- Visual preview of selected color
- Confirmation state tracking

**Key Methods**:

- `handleColorSelect`: Updates temporary color selection
- `handleConfirm`: Applies selected color and closes selector
- `handleCancel`: Reverts to previous color and closes selector
- `resetToDefault`: Resets color selection to default value

### 3. Sidebar System

#### Sidebar Container (`app/components/sidebar/sidebar-container.tsx`)

**Purpose**: Main sidebar wrapper with footer integration

**Features**:

- Sidebar component orchestration
- Footer modal management
- Keyboard event handling (Escape key)
- Patreon widget integration

**Type Definition**: Uses `FileData` interface and Firebase `User` type

**Key Props**:

```typescript
interface SidebarContainerProps {
  user: User;
  onImageSelect: (file: FileData) => void;
  imageId?: string;
  onCaseChange: (caseNumber: string) => void;
  currentCase: string;
  files: FileData[];
  // ... additional props for state management
}
```

#### Sidebar (`app/components/sidebar/sidebar.tsx`)

**Purpose**: Core sidebar functionality

**Features**:

- Case management interface
- File upload and selection
- Image management controls

**Type Definition**: Uses Firebase `User` type and `FileData` interface

#### Case Sidebar (`app/components/sidebar/case-sidebar.tsx`)

**Purpose**: Case-specific sidebar functionality

**Features**:

- Case creation and management
- File upload interface
- Image selection and deletion
- Case validation and error handling

**Type Definition**: Uses component-specific `CaseSidebarProps` interface with `FileData` and Firebase `User` types

**Key Props**:

```typescript
interface CaseSidebarProps {
  user: User;
  onImageSelect: (file: FileData) => void;
  onCaseChange: (caseNumber: string) => void;
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  onNotesClick: () => void;
  files: FileData[];
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
  caseNumber: string;
  setCaseNumber: (caseNumber: string) => void;
  currentCase: string | null;
  setCurrentCase: (caseNumber: string) => void;
}
```

#### Notes Sidebar (`app/components/sidebar/notes-sidebar.tsx`)

**Purpose**: Annotation and notes management interface

**Features**:

- Comprehensive annotation forms
- Color selection integration
- Classification options (Bullet, Cartridge Case, Other)
- Support level selection (ID, Exclusion, Inconclusive)
- Index type management (number/color)
- Subclass characteristics
- Additional notes handling

**Type Definition**: Uses component-specific interface with custom types for classification options

**Key Props**:

```typescript
interface NotesSidebarProps {
  currentCase: string;
  onReturn: () => void;
  user: User;
  imageId: string;
  onAnnotationRefresh?: () => void;
}
```

**Data Types**:

```typescript
type ClassType = 'Bullet' | 'Cartridge Case' | 'Other';
type IndexType = 'number' | 'color';
type SupportLevel = 'ID' | 'Exclusion' | 'Inconclusive';
```

#### Cases Modal (`app/components/sidebar/cases-modal.tsx`)

**Purpose**: Case selection and management modal

**Features**:

- Paginated case listing
- Case selection interface
- Loading states and error handling
- Keyboard navigation (Escape key)

**Type Definition**: Uses component-specific `CasesModalProps` interface

**Props**:

```typescript
interface CasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCase: (caseNum: string) => void;
  currentCase: string;
  user: User;
}
```

#### Notes Modal (`app/components/sidebar/notes-modal.tsx`)

**Purpose**: Additional notes editing modal

**Features**:

- Text area for detailed notes
- Save/cancel functionality
- Keyboard event handling
- Temporary state management

**Type Definition**: Uses component-specific `NotesModalProps` interface

**Props**:

```typescript
interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: string;
  onSave: (notes: string) => void;
}
```

#### Case Export (`app/components/sidebar/case-export/case-export.tsx`)

**Purpose**: Comprehensive case data export modal interface with ZIP file support

**Features**:

- Case number input with auto-population from current case
- **Format Selection**: JSON, CSV/Excel, and ZIP export formats with visual toggle
- **ZIP Export with Images**: Single case export with complete data files and associated images
- **Image Inclusion Options**: Checkbox to include/exclude images in ZIP exports
- **Single Case Export**: Export individual case with complete annotation data
- **Bulk Export**: Export all cases with real-time progress tracking
- **Excel Multi-Worksheet**: CSV format creates Excel files with summary and individual case worksheets
- **Comprehensive Data**: All annotation fields including case identifiers, colors, classifications, and split box annotations
- Loading states and error handling with detailed error messages
- Keyboard navigation (Escape key) and accessible controls
- Automatic case number pre-filling when case is loaded
- Progress visualization for bulk export operations with case-by-case updates
- **Synchronized UI States**: Export button and checkboxes disabled appropriately during operations

**Type Definition**: Uses component-specific `CaseExportProps` interface

**Props**:

```typescript
interface CaseExportProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (caseNumber: string, format: ExportFormat, includeImages?: boolean) => void;
  onExportAll: (onProgress: (current: number, total: number, caseName: string) => void, format: ExportFormat) => void;
  currentCaseNumber?: string;
}

export type ExportFormat = 'json' | 'csv';
```

**Enhanced Export Features**:

- **ZIP Package Creation**: Complete case export with data files and images in structured ZIP archive
- **JSZip Integration**: Browser-based ZIP file generation with progress tracking
- **Image Download System**: Automatic image fetching and packaging for ZIP exports
- **Data Parity**: CSV/Excel exports contain identical data to JSON exports (22+ columns total)
- **Split Box Annotations**: Box annotations split into separate rows for improved data analysis
- **Format Indicators**: Clear UI showing format types with tooltips explaining functionality
- **Progress Callbacks**: Real-time progress updates during bulk export operations
- **Error Recovery**: Graceful handling of failed exports with detailed error reporting
- **Performance Optimization**: Optional annotation inclusion for faster exports when only metadata is needed
- **Disabled State Management**: UI components properly synchronized during export operations

### 4. Action Components

#### Case Management (`app/components/actions/case-manage.ts`)

**Purpose**: Complete case lifecycle management

**Key Functions**:

```typescript
export const validateCaseNumber = (caseNumber: string): boolean
export const checkExistingCase = async (
  caseNumber: string, 
  user: User
): Promise<boolean>
export const createNewCase = async (
  caseNumber: string, 
  user: User
): Promise<{ success: boolean; message: string }>
export const renameCase = async (
  oldCaseNumber: string,
  newCaseNumber: string,
  user: User
): Promise<{ success: boolean; message: string }>
export const deleteCase = async (
  caseNumber: string,
  user: User
): Promise<{ success: boolean; message: string }>
export const listCases = async (user: User): Promise<string[]>
```

**Features**:

- Case number validation
- Duplicate case detection
- Case creation and deletion
- Case renaming functionality
- User case list management

#### Case Export (`app/components/actions/case-export.ts`)

**Purpose**: Comprehensive case data export functionality with multi-format support including ZIP packages

**Key Functions**:

```typescript
export const exportCaseData = async (
  user: User,
  caseNumber: string,
  options: ExportOptions
): Promise<CaseExportData>

export const exportAllCases = async (
  user: User,
  options: ExportOptions,
  onProgress?: (current: number, total: number, caseName: string) => void
): Promise<AllCasesExportData>

export const downloadCaseAsJSON = (exportData: CaseExportData): void
export const downloadCaseAsCSV = (exportData: CaseExportData): void
export const downloadCaseAsZip = async (exportData: CaseExportData, includeImages: boolean): Promise<void>
export const downloadAllCasesAsJSON = (exportData: AllCasesExportData): void
export const downloadAllCasesAsCSV = (exportData: AllCasesExportData): void

export interface ExportOptions {
  includeAnnotations?: boolean;
  format?: 'json' | 'csv' | 'zip';
  includeMetadata?: boolean;
  includeImages?: boolean;
}
```

**Enhanced Features**:

- **ZIP Export Functionality**: Complete case packaging with data files and images
- **JSZip Integration**: Browser-based ZIP file creation with automatic image downloading
- **Comprehensive Single Case Export**: Complete file and annotation data collection with metadata
- **Bulk Export with Progress**: Export all user cases with real-time progress callbacks and error handling
- **Multi-Format Support**: JSON for structured data, CSV for single cases, Excel (.xlsx) for bulk exports, ZIP for complete packages
- **Excel Multi-Worksheet**: Bulk CSV exports create Excel files with summary worksheet and individual case worksheets
- **Complete Data Parity**: CSV/Excel formats include all annotation fields matching JSON exports
- **Split Box Annotation Format**: Box annotations split into separate rows for improved data analysis
- **Enhanced Box Annotations**: Includes coordinates, colors, timestamps in structured format (label property removed)
- **Forensic Classification Support**: Full case identifiers, color schemes, support levels, and classification data
- **Performance Options**: Configurable annotation inclusion for faster exports when only metadata needed
- **Error Recovery**: Graceful handling of failed case exports with detailed error reporting and continuation
- **File Download Utilities**: Browser-compatible download functions with proper MIME types and cleanup
- **Export Validation**: Comprehensive case number and data validation before export operations
- **Image Management**: Automatic image URL fetching and packaging for ZIP exports

**CSV/Excel Export Columns (22+ total with split format)**:

1. File ID, Original Filename, Upload Date, Has Annotations
2. **Case Identifiers**: Left Case, Right Case, Left Item, Right Item  
3. **Visual Elements**: Case Font Color, Index Type, Index Number, Index Color
4. **Classifications**: Class Type, Custom Class, Class Note, Support Level
5. **Options**: Has Subclass, Include Confirmation
6. **Annotations**: Box Annotations Count, Individual Box Annotation Details (split rows with coordinates, colors, timestamps)
7. **Metadata**: Additional Notes, Last Updated

**ZIP Export Structure**:

- **Data Files**: JSON and CSV formats included in ZIP package
- **Image Directory**: All case images organized in `images/` folder within ZIP
- **Structured Layout**: Professional organization with clear file naming conventions
- **Progress Tracking**: Real-time download progress for images and ZIP creation

**XLSX Library Integration**:

- **Multi-Worksheet Excel**: Summary sheet plus individual case sheets for bulk exports
- **Structured Data Layout**: Professional formatting with headers and metadata sections
- **Sheet Naming**: Excel-compatible sheet names with case number identifiers
- **Error Sheets**: Dedicated worksheets for failed case exports with error details
- **Split Annotation Format**: Box annotations displayed in separate rows for better analysis

#### Image Management (`app/components/actions/image-manage.ts`)

**Purpose**: Image upload and retrieval operations

**Key Functions**:

```typescript
export const uploadImage = async (
  file: File, 
  caseNumber: string, 
  apiKey: string
): Promise<UploadResult>

export const getImageUrl = async (
  imageId: string, 
  apiKey: string
): Promise<string>

export const deleteImage = async (
  imageId: string, 
  apiKey: string
): Promise<void>

export const fetchFiles = async (
  caseNumber: string,
  apiKey: string
): Promise<FileData[]>

export const uploadFile = async (
  file: File,
  caseNumber: string,
  apiKey: string
): Promise<{ success: boolean; message: string; fileData?: FileData }>

export const deleteFile = async (
  fileId: string,
  caseNumber: string,
  apiKey: string
): Promise<{ success: boolean; message: string }>
```

#### PDF Generation (`app/components/actions/generate-pdf.ts`)

**Purpose**: PDF report generation

**Features**:

- Dynamic PDF creation
- Annotation integration
- Custom formatting
- Error handling and progress feedback

**Key Function**:

```typescript
export const generatePDF = async (
  imageUrl: string,
  caseNumber: string,
  annotationData: AnnotationData | null,
  activeAnnotations: Set<string>,
  firstName?: string
): Promise<{ success: boolean; message: string }>
```

#### Notes Management (`app/components/actions/notes-manage.ts`)

**Purpose**: Annotation and notes data management

**Features**:

- CRUD operations for annotation data
- Data validation and sanitization
- Error handling for API operations

**Key Functions**:

```typescript
export const getNotes = async (
  caseNumber: string,
  imageId: string,
  apiKey: string
): Promise<AnnotationData | null>

export const saveNotes = async (
  caseNumber: string,
  imageId: string,
  notesData: AnnotationData,
  apiKey: string
): Promise<{ success: boolean; message: string }>
```

#### Sign Out (`app/components/actions/signout.tsx`)

**Purpose**: User authentication logout

**Features**:

- Firebase sign out
- Local storage cleanup
- Redirect handling
- Error handling

**Type Definition**: Uses component-specific `SignOutProps` interface

**Props**:

```typescript
interface SignOutProps {
  redirectTo?: string;
}
```

### 5. UI Components

#### Button System (`app/components/button/`)

**Purpose**: Reusable button components

**Components**:

- `Button` - Standard button with variants

**Type Definition**: Uses component-specific `ButtonProps` interface

**Props**:

```typescript
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}
```

#### Color System (`app/components/colors/colors.tsx`)

**Purpose**: Color selection interface

**Features**:

- Predefined color palette
- Custom color wheel
- Color validation
- Real-time preview

**Type Definition**: Uses component-specific `ColorSelectorProps` interface

**Props**:

```typescript
interface ColorSelectorProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}
```

#### Footer Component (`app/components/footer/footer.tsx`)

**Purpose**: Application footer with navigation and social links

**Features**:

- External link navigation
- Patreon integration
- Dynamic year display
- Terms and privacy links

**Type Definition**: Uses standard React component types without custom interfaces

#### Icon System (`app/components/icon/icon.tsx`)

**Purpose**: Centralized icon management

**Features**:

- SVG icon system
- Consistent sizing and styling
- Type-safe icon names
- Available icons: eye, eye-off, class, ID, index, notes, number, print, other unused/misc icons

**Type Definition**: Uses custom icon type definitions for type-safe icon selection

**Usage**:

```tsx
<Icon icon="eye" />
<Icon icon="eye-off" />
```

#### Mobile Warning (`app/components/mobile/mobile-warning.tsx`)

**Purpose**: Mobile device usage warning

**Features**:

- Responsive design detection
- Route-specific display
- User experience guidance
- Desktop-only enforcement

**Type Definition**: Uses standard React component types without custom interfaces

#### Notice System (`app/components/notice/notice.tsx`)

**Purpose**: Modal notification display

**Features**:

- Dynamic content rendering
- Keyboard event handling (Escape key)
- Customizable button text
- Overlay backdrop

**Type Definition**: Uses component-specific `NoticeProps` interface

**Props**:

```typescript
interface NoticeProps {
  isOpen: boolean;
  onClose: () => void;
  notice: {
    title: string;
    content: React.ReactNode;
    buttonText?: string;
  };
}
```

#### Toast System (`app/components/toast/toast.tsx`)

**Purpose**: User feedback and notifications

**Features**:

- Success and error message display
- Auto-dismiss functionality
- Customizable styling

**Type Definition**: Uses component-specific `ToastProps` interface

**Props**:

```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  isVisible: boolean;
  onClose: () => void;
}
```

#### Toolbar (`app/components/toolbar/toolbar.tsx`)

**Purpose**: Main application toolbar

**Features**:

- Tool selection management (number, class, index, id, notes, box, print, visibility)
- PDF generation controls
- Visibility toggle
- Active tool state tracking
- Box annotation mode with color selector integration

**Type Definition**: Uses component-specific `ToolbarProps` interface and `ToolId` type

**Props**:

```typescript
interface ToolbarProps {
  onToolSelect?: (toolId: ToolId, active: boolean) => void;
  onGeneratePDF?: () => void;
  canGeneratePDF?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  isGeneratingPDF?: boolean;
}

type ToolId = 'number' | 'class' | 'index' | 'id' | 'notes' | 'print' | 'visibility' | 'box';
```

#### Turnstile CAPTCHA (`app/components/turnstile/turnstile.tsx`)

**Purpose**: Cloudflare Turnstile CAPTCHA integration

**Features**:

- Security verification
- Theme customization
- Widget lifecycle management
- Callback handling

**Type Definition**: Uses component-specific `TurnstileProps` interface extending HTML div attributes

**Props**:

```typescript
interface TurnstileProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  onWidgetId?: (id: string) => void;
  success?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}
```

#### Theme Provider (`app/components/theme-provider/theme-provider.tsx`)

**Purpose**: Application theme management

**Features**:

- Theme context provision
- Theme persistence
- System theme detection
- Theme switching functionality

**Type Definition**: Uses custom `Theme` type definition from theme.ts

**Theme Types** (`app/components/theme-provider/theme.ts`):

```typescript
type Theme = 'light' | 'dark' | 'system';
```

### 6. User Management Components

#### User Profile Management (`app/components/user/manage-profile.tsx`)

**Purpose**: Comprehensive user profile management

**Features**:

- Profile information editing (display name)
- Email address viewing (read-only)
- Company information viewing (read-only)
- Password change functionality
- User reauthentication
- Firebase integration
- Error handling with detailed messages

**Type Definition**: Uses component-specific `ManageProfileProps` interface

**Props**:

```typescript
interface ManageProfileProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Key Features**:

- Display name modification
- Company information management (read-only)
- Email address display (read-only)
- User permission status loading
- Account deletion functionality
- Firebase error handling integration

#### Delete Account (`app/components/user/delete-account.tsx`)

**Purpose**: Secure account deletion with permission-based restrictions

**Features**:

- User account deletion with confirmation
- Demo account protection (deletion disabled for `permitted=false`)
- Dual confirmation requirements (UID + email)
- Conditional messaging based on account type
- Email notifications on successful deletion
- Firebase authentication integration
- Automatic logout after deletion

**Type Definition**: Uses component-specific `DeleteAccountProps` interface with user object type

**Props**:

```typescript
interface DeleteAccountProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
  };
  company: string;
  permitted: boolean;
}
```

**Permission-Based Behavior**:

- **Regular Accounts** (`permitted=true`): Full deletion functionality with standard warnings
- **Demo Accounts** (`permitted=false`): Deletion disabled with informational messaging

**Security Features**:

- Requires exact UID confirmation
- Requires exact email address confirmation
- Demo account protection
- API key authentication for deletion requests

#### Inactivity Warning (`app/components/user/inactivity-warning.tsx`)

**Purpose**: Session timeout management

**Features**:

- Inactivity detection
- Warning countdown display
- Session extension handling

**Type Definition**: Uses custom hook types from `useInactivityTimeout` hook

## Component State Management

### Local State Patterns

Most components use React's built-in state management:

```typescript
// Typical state structure
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | undefined>();
const [data, setData] = useState<DataType | null>(null);
```

### Context Usage

#### AuthContext (`app/contexts/auth.context.ts`)

**Purpose**: Global authentication state

**Provided Values**:

- Current user information
- Authentication status
- Login/logout functions

### Custom Hooks

#### useInactivityTimeout (`app/hooks/useInactivityTimeout.ts`)

**Purpose**: Session inactivity management

**Features**:

- Configurable timeout periods
- Activity detection
- Automatic logout on timeout

## Component Communication Patterns

### Props Down, Events Up

Components follow React's unidirectional data flow:

```typescript
// Parent component
const [selectedImage, setSelectedImage] = useState<string>();

// Child component receives data and callbacks
<ImageSelector 
  images={images}
  onImageSelect={setSelectedImage}
/>
```

### Event Handling

Components use callback props for communication:

```typescript
interface ComponentProps {
  onSuccess: () => void;
  onError: (message: string) => void;
  onDataChange: (data: DataType) => void;
}
```

### Modal and Dialog Patterns

Many components follow consistent modal patterns:

```typescript
// Common modal interface
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Keyboard event handling for modals
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (isOpen) {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }
}, [isOpen, onClose]);
```

## Styling Approach

### CSS Modules

Components use CSS Modules for scoped styling:

```typescript
// Component file
import styles from './component.module.css';

// Usage
<div className={styles.container}>
  <button className={styles.primaryButton}>
    Click me
  </button>
</div>
```

### Style Conventions

- **BEM-like naming**: `styles.componentName__elementName--modifier`
- **CSS Custom Properties**: For theming and consistency
- **Intuitive Design**: Clean, simple, user-friendly interfaces
- **Accessibility**: ARIA labels and semantic HTML

## Performance Considerations

### Component Lifecycle

Components are designed for efficient mounting and unmounting:

```typescript
useEffect(() => {
  // Setup
  const cleanup = setupComponent();
  
  // Cleanup
  return cleanup;
}, [dependencies]);
```

## Accessibility Features

### Built-in Accessibility

- **Semantic HTML**: Proper element usage
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus handling
- **Color Contrast**: WCAG compliance

## Development Guidelines

### Component Creation Checklist

1. ✅ Create component directory
2. ✅ Implement TypeScript interfaces
3. ✅ Add CSS Module styling
4. ✅ Include error handling (follow [Error Handling Guide](https://developers.striae.org/striae-dev/guides/error-handling))
5. ✅ Add loading states
6. ✅ Implement accessibility features
7. ✅ Add documentation

### Best Practices

- **Single Responsibility**: Each component has one clear purpose
- **Type Safety**: Full TypeScript coverage
- **Error Boundaries**: Graceful error handling (see [Error Handling Guide](https://developers.striae.org/striae-dev/guides/error-handling))
- **Performance**: Optimized for large datasets
- **Maintainability**: Clear, documented code

# Striae Release Notes - v1.1.1

**Release Date**: February 13, 2026  
**Period**: February 8, 2026 - February 13, 2026  
**Total Commits**: 4 (File Upload Enhancements)

## 🎉 Patch Release - Multi-File Upload Capabilities

### v1.1.1 File Upload & UI Improvements

- **📁 Multi-File Upload Support** - Upload multiple image files simultaneously using drag & drop or file picker
- **⏳ Sequential Upload Processing** - Files upload one-at-a-time in order with automatic permission refresh
- **📊 Enhanced Progress Feedback** - Real-time file counter (e.g., "2 of 5") showing position in batch with current filename display
- **✅ Automatic File List Refresh** - Case sidebar file list updates immediately after each upload completes
- **🎨 Improved Upload UX** - Better visual feedback during multi-file operations with per-file status tracking

## 🔍 Detailed Changes

### Upload System Enhancements

- **📁 Multi-File Upload Implementation** - Complete redesign of file upload system
  - Added `multiple` attribute to file input for multi-select capability
  - Drag & drop now accepts any number of files simultaneously
  - File picker dialog allows selecting multiple files at once
  - Sequential processing ensures orderly, predictable uploads
  - Partial failures don't block remaining uploads - continues even if one file fails

- **⏳ Sequential Upload Processing** - Intelligent file queue management
  - Files upload one at a time in the order selected
  - Each file completes before the next begins
  - Clear error handling for individual file failures
  - Permission checks refreshed after each successful upload
  - Accumulated files passed through upload loop for accurate state tracking

- **📊 Enhanced Progress UI** - Better visualization during batch uploads
  - Progress percentage (0-100%) displayed during each file upload
  - File counter shows "X of Y" for multi-file batches (hidden for single files)
  - Current filename displayed as it's being uploaded
  - "Processing..." message when upload completes before server processing
  - Per-file error messages with filename context (e.g., "image.png: File too large")

### Bug Fixes

- **✅ File List Update Issue** - Fixed file list only showing last file in multi-upload batches
  - Root cause: Each iteration used original `currentFiles` prop (stale closure)
  - Solution: Track accumulated files within `processFileQueue` function
  - Each upload iteration now receives the accumulated files from previous uploads
  - State updates immediately after each file completes via `onFilesChanged` callback
  - Multiple files now correctly display in the file list as uploads complete

- **🎨 Progress UI Refinement** - Improved visual hierarchy and clarity
  - New `.uploadStatusContainer` for flexible progress info layout
  - Added `.fileCountText` for subtle counter display
  - Added `.currentFileName` with text truncation for long filenames
  - Better spacing and alignment during batch operations

### CSS Updates

- **📦 New Styles** - Added support for multi-file UI elements
  - `.uploadStatusContainer` - Flexbox layout for progress information
  - `.fileCountText` - Subtle styling for file counter (0.75rem, lighter color)
  - `.currentFileName` - Truncated filename display with ellipsis

## 🎯 Key Enhancement Summary

| Feature | Details | Impact |
|---------|---------|--------|
| **Multi-File Upload** | Both UI and drag-drop support | 📁 Users can now batch upload multiple images |
| **Sequential Processing** | One file at a time with permission refresh | ⏳ Predictable behavior with proper access control |
| **File List Updates** | Refresh after each file completes | ✅ Immediate visual feedback in sidebar |
| **Progress Feedback** | File counter and current filename | 📊 Clear status during batch operations |
| **Error Handling** | Per-file errors don't block batch | 🛑 Graceful failure handling |

## 🔧 Technical Implementation Details

### Multi-File Upload Architecture

The upload system uses a state-aware queue system:

```typescript
// State tracking for batch uploads
const [uploadQueue, setUploadQueue] = useState<File[]>([]);
const [currentFileIndex, setCurrentFileIndex] = useState(0);
const [currentFileName, setCurrentFileName] = useState('');

// Process files sequentially with accumulated state
const processFileQueue = async (filesToProcess: File[]) => {
  let accumulatedFiles = currentFiles;
  
  for (let i = 0; i < filesToProcess.length; i++) {
    const result = await validateAndUploadFile(file, accumulatedFiles);
    if (result.success) {
      accumulatedFiles = result.files; // Use updated files for next iteration
    }
  }
};
```

### File List Refresh Pattern

Rather than relying on prop updates between iterations, the component accumulates files locally:

1. Start with `currentFiles` prop as baseline
2. Each file validates and uploads with accumulated list
3. Upload returns `{ success, files }` with updated list
4. Next iteration receives updated list
5. State updates propagate via `onFilesChanged` callback to parent

This ensures:
- ✅ Each file appears in list after upload completes
- ✅ No stale closure issues
- ✅ Proper permission refresh based on accumulated file count
- ✅ Clear error tracking per file

## 📝 Upgrade Notes

No breaking changes. Existing single-file workflows continue working unchanged.

### New Capabilities

Users can now:
1. **Drag & drop multiple files** at once onto the upload zone
2. **Select multiple files** from the file picker dialog
3. **See real-time progress** with "X of Y" file counter
4. **Monitor current file** with filename display
5. **Watch file list update** as each upload completes

### User Experience

- Single file uploads: Simplified progress display (no counter)
- Multi-file uploads: Detailed progress with file counter and current filename
- Errors: Per-file error messages with auto-dismiss after 3 seconds
- Continuation: Partial failures don't stop the upload batch

---

**Full Changelog**: [v1.1.0...v1.1.1](https://github.com/striae-org/striae/compare/v1.1.0...v1.1.1)

# Backup and Restore System Design

## Overview

The AI File Organizer's backup and restore system is designed around the principle that **users should never lose data** when using the application. Every time the AI reorganizes files, it creates a comprehensive safety net that allows complete rollback to the previous state.

## Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   BackupManager │────│  BackupStrategy  │────│  BackupStorage  │
│   (Orchestrator)│    │   (Algorithm)    │    │   (Persistence) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────┴────────┐             │
         │              │                 │             │
         ▼              ▼                 ▼             ▼
┌─────────────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐
│  RestoreEngine  │  │   Full   │  │ Incremental  │  │   Metadata   │
│   (Recovery)    │  │ Backup   │  │   Backup     │  │    Backup    │
└─────────────────┘  └──────────┘  └──────────────┘  └──────────────┘
```

### Component Responsibilities

#### BackupManager (Central Orchestrator)
- **Event-driven coordination**: Extends EventEmitter for real-time progress tracking
- **Strategy selection**: Chooses optimal backup type based on directory size and operation type
- **Metadata management**: Tracks backup history, filtering, and lifecycle
- **Error handling**: Comprehensive error capture with user-friendly messages

#### BackupStorage (Persistence Layer)
- **Compression**: gzip compression reduces storage by ~70%
- **Integrity verification**: SHA256 checksums prevent data corruption
- **Atomic operations**: Ensures backup consistency during write operations
- **Metadata indexing**: Fast backup discovery without full data loading

#### RestoreEngine (Recovery Operations)
- **Conflict detection**: Identifies file differences before restoration
- **Resolution strategies**: Multiple conflict handling approaches
- **Preview mode**: Shows what would happen without making changes
- **Selective restore**: Restore specific files or directories only

## Backup Strategies

### 1. Full Backup (Default)
**When Used**: Before any major reorganization operation

**What's Included**:
- Complete directory structure (nested folder hierarchy)
- File metadata (size, timestamps, permissions, ownership)
- Small file contents (< 1MB) stored directly in backup
- Large file checksums for integrity verification
- Application settings snapshot

**Benefits**:
- Maximum safety and recovery capability
- Self-contained backup (no dependencies)
- Fast restore operations (everything available)

**Storage**: Medium size (metadata + small files)

### 2. Incremental Backup
**When Used**: Large directories (>1000 files) or frequent operations

**What's Included**:
- Only changed files since last backup
- Directory structure deltas (new/removed folders)
- Reference to previous backup for unchanged data
- Change tracking metadata

**Benefits**:
- Minimal storage usage for frequent backups
- Fast backup creation for large datasets
- Efficient for tracking incremental changes

**Storage**: Small (only changes)

### 3. Metadata Backup
**When Used**: Quick operations, low storage scenarios, or structure-only changes

**What's Included**:
- File and directory metadata only
- Permissions and ownership information
- Directory structure representation
- No file content (fastest option)

**Benefits**:
- Extremely fast backup/restore cycles
- Minimal disk space usage
- Perfect for structure-only reorganizations

**Storage**: Minimal (just metadata)

## Data Model

### Backup Data Structure

```typescript
interface BackupData {
  metadata: {
    id: "backup-1703123456789-abc123"      // Unique identifier
    timestamp: Date                         // Creation time
    type: "full" | "incremental" | "metadata"
    targetPath: "/Users/john/Documents"    // Original location
    size: 2048576                          // Backup size in bytes
    compressionRatio: 0.7                  // Compression efficiency
    operationType: "reorganization"        // Why backup was created
    description?: "Manual user backup"     // Optional description
    tags: ["auto", "reorganization"]       // Searchable labels
    integrity: {
      checksum: "sha256:abc123..."         // Data integrity hash
      verified: true                       // Verification status
      lastVerification: Date               // Last check time
    }
  }
  
  structure: {
    root: "/Users/john/Documents"
    tree: [
      {
        path: "/Users/john/Documents/Projects"
        name: "Projects"
        children: [...]                     // Nested structure
        files: ["README.md", "notes.txt"]  // Files in directory
        metadata: {
          created: Date, modified: Date, accessed: Date
          fileCount: 15, totalSize: 102400
          permissions: { readable: true, writable: true, executable: false }
        }
      }
    ]
  }
  
  files: [
    {
      path: "/Users/john/Documents/README.md"
      originalPath: "/Users/john/Documents/README.md"
      metadata: {
        size: 1024, created: Date, modified: Date, accessed: Date
        isDirectory: false, isSymlink: false
        extension: "md", mimeType: "text/markdown"
      }
      content?: Buffer                      // For small files
      contentHash: "sha256:def456..."      // Content verification
      permissions: {
        readable: true, writable: true, executable: false
        mode: 644                          // Unix permissions
      }
    }
  ]
  
  permissions: [...]                       // Detailed permission backup
  settings: {                              // App settings snapshot
    version: "1.0.0"
    settings: {...}
    timestamp: Date
  }
}
```

## Workflow Examples

### Automatic Backup Before Reorganization

```
User: "Reorganize /Documents using Johnny Decimal"
  ↓
AI File Organizer: Analyzes directory (1000+ files detected)
  ↓
BackupManager: Selects Incremental Strategy (optimal for large directories)
  ↓
BackupStrategy: Scans directory, identifies changes, creates backup data
  ↓
BackupStorage: Compresses data (1GB → 300MB), calculates checksum, stores to disk
  ↓
AI File Organizer: Proceeds with reorganization
  ↓
User: Receives confirmation with backup ID for potential rollback
```

### User-Initiated Restore

```
User: "Restore backup-1703123456789-abc123"
  ↓
RestoreEngine: Loads backup, analyzes target directory for conflicts
  ↓
Conflict Detection: Finds 3 files that were modified since backup
  ↓
User Prompt: "3 files have been modified. How should we handle conflicts?"
Options: [Overwrite] [Skip] [Rename] [Preview Changes]
  ↓
User: Selects "Rename" 
  ↓
RestoreEngine: Restores all files, renames conflicting files with .backup suffix
  ↓
Result: "Restored 247 files, renamed 3 conflicting files"
```

## Safety Mechanisms

### Integrity Protection
- **SHA256 checksums**: Every backup verified on creation and retrieval
- **Compression validation**: Ensures data integrity through compression/decompression cycle
- **Metadata separation**: Quick integrity checks without full data loading
- **Corruption detection**: Automatic validation warns of data issues

### Conflict Resolution Strategies

```typescript
interface FileConflict {
  type: 'exists' | 'modified' | 'permission' | 'structure'
  currentPath: string                      // Current file location
  backupPath: string                       // Original backup location
  severity: 'low' | 'medium' | 'high'     // Risk assessment
  resolution?: ConflictResolutionType      // How to handle
}

type ConflictResolutionType = 
  | 'overwrite'    // Replace current with backup version
  | 'skip'         // Keep current, ignore backup version
  | 'rename'       // Restore backup with .backup suffix
  | 'merge'        // Attempt intelligent merging (future)
  | 'prompt'       // Ask user for each conflict
```

### Atomic Operations
- **Two-phase commit**: Backup creation is atomic (all or nothing)
- **Temporary files**: Restoration uses temp files before final placement
- **Rollback capability**: Failed operations can be automatically reversed
- **Progress checkpoints**: Large operations can resume from failure points

## Performance Optimizations

### Smart Strategy Selection

```typescript
function selectOptimalStrategy(targetPath: string): BackupType {
  const stats = analyzeDirectory(targetPath)
  
  if (stats.fileCount < 100) {
    return 'full'        // Small directory - full backup is fast
  }
  
  if (stats.fileCount > 1000) {
    return 'incremental' // Large directory - incremental is efficient
  }
  
  if (stats.totalSize < 10 * 1024 * 1024) { // < 10MB
    return 'full'        // Small total size - full backup acceptable
  }
  
  return 'metadata'      // Structure-focused operations
}
```

### Storage Efficiency
- **gzip compression**: ~70% storage reduction for text-heavy directories
- **Content deduplication**: Identical files share storage (future enhancement)
- **Incremental chains**: Related backups link together for space efficiency
- **Retention policies**: Automatic cleanup of old backups based on rules

### Memory Management
- **Streaming operations**: Large files processed in chunks to minimize memory usage
- **Progressive loading**: Backup data loaded on-demand during restore
- **Background processing**: Non-critical operations moved to background threads
- **Chunk-based processing**: Large directories processed in manageable segments

## Error Handling

### Backup Creation Errors
- **Storage full**: Graceful degradation to metadata-only backup
- **Permission denied**: Skip protected files with warning, continue with accessible files
- **File locked**: Retry with exponential backoff, skip if persistently locked
- **Checksum mismatch**: Retry backup creation, validate storage medium

### Restore Errors
- **Target path missing**: Create directory structure as needed
- **Permission conflicts**: Attempt permission elevation, fallback to user directory
- **Disk space insufficient**: Selective restore with user prioritization
- **Backup corruption**: Attempt partial restore, notify user of data loss

## Security and Privacy

### Local-First Design
- **No cloud dependency**: All backups stored locally on user's machine
- **User ownership**: Complete control over backup data and retention
- **No telemetry**: Backup operations don't transmit data externally

### Optional Encryption (Future)
- **AES-256 encryption**: Industry-standard encryption for sensitive directories
- **Key derivation**: PBKDF2 with user-provided passwords
- **Metadata protection**: Even backup metadata can be encrypted
- **Cross-platform compatibility**: Encrypted backups work across all supported platforms

## User Experience

### Transparent Operations
- **Automatic backups**: Seamlessly integrated into reorganization workflow
- **Progress indicators**: Real-time feedback for long-running operations
- **Success notifications**: Clear confirmation with backup IDs for reference
- **Error explanations**: User-friendly error messages with suggested actions

### Backup Management
- **Visual browser**: GUI for browsing and managing backups
- **Search and filter**: Find backups by date, path, type, or tags
- **Preview functionality**: See what files would be restored before committing
- **Bulk operations**: Select and delete multiple old backups

### Recovery Workflows
- **One-click restore**: Simple restoration for common scenarios
- **Guided conflict resolution**: Step-by-step handling of complex conflicts
- **Partial restore**: Restore specific files or directories only
- **Restore preview**: "What if" analysis before making changes

## Implementation Status

### ✅ Completed Components
- **Type definitions** (404 lines): Comprehensive TypeScript interfaces
- **BackupManager**: Event-driven orchestrator with strategy selection
- **BackupStorage**: Compression, checksumming, atomic operations
- **Test suite**: 479 lines of comprehensive TDD tests

### 🔄 Currently Implementing
- **RestoreEngine**: Conflict detection and resolution logic
- **Backup strategies**: Full, Incremental, and Metadata implementations
- **Integration testing**: End-to-end backup/restore workflows

### 📋 Planned Enhancements
- **GUI integration**: React components for backup management
- **Retention policies**: Automatic cleanup with user-configurable rules
- **Performance monitoring**: Backup operation metrics and optimization
- **Cross-platform testing**: Windows, macOS, Linux compatibility validation

## Technical Benefits

1. **User Confidence**: Users can fearlessly use AI reorganization knowing they can undo anything
2. **Data Safety**: Multiple layers of protection against data loss
3. **Performance**: Smart strategy selection prevents backup overhead
4. **Storage Efficiency**: Compression and incremental backups manage disk usage
5. **Reliability**: Checksums and validation ensure backup integrity
6. **Flexibility**: Multiple restore options for different recovery scenarios
7. **Integration**: Seamless integration with AI File Organizer workflows

This backup system transforms the AI File Organizer from a potentially risky automation tool into a confidence-inspiring assistant that enhances file organization while maintaining complete safety and user control.
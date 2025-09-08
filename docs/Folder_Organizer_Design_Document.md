# Folder Organizer App - Design Document

## 📋 Project Overview

**Application Name**: AI Folder Organizer  
**Platform**: Cross-platform (Windows, macOS, Linux)  
**Framework**: Tauri + React + TypeScript  
**Purpose**: Intelligent file organization using local LLM assistance

## 🎨 Visual Design Mockups

### Main Application Window (Light Theme)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🗂️ AI Folder Organizer                                          [─][□][×]        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [📁 Select Folder] [🤖 Analyze Folder] [⚡ Apply Changes] [⚙️ Settings]        │
├─────────────────┬─────────────────┬─────────────────────────────────────────────┤
│  CURRENT        │  PROPOSED       │           ACTIONS                           │
│  STRUCTURE      │  STRUCTURE      │                                             │
│  ┌─────────────┐│  ┌─────────────┐│  ┌─ Organization Type ─────────────────┐  │
│  │📁 Downloads ││  │📁 Downloads ││  │ ○ Johnny Decimal System           │  │
│  │├─📄 doc1.pdf││  │├─📁 10-19 P │  │ ○ By File Type                    │  │
│  │├─🖼️ img1.jpg││  ││ └─📄 doc1.pdf│  │ ○ By Date Created                 │  │
│  │├─📄 file.txt││  │├─📁 20-29 D │  │ ○ Custom AI Rules                 │  │
│  │├─🎵 song.mp3││  ││ └─📄 file.txt│  └───────────────────────────────────────┘  │
│  │├─🎬 vid.mp4 ││  │├─📁 30-39 T │  │                                             │
│  │└─📦 app.zip││  ││ └─📦 app.zip │  │  ┌─ LLM Status ─────────────────────┐  │
│  │             ││  │└─📁 40-49 M │  │  │ 🟢 Ollama Connected              │  │
│  │             ││  │  ├─🖼️ img1.jpg│  │  │ Model: llama3.2                  │  │
│  │             ││  │  ├─🎵 song.mp3│  │  │ Response time: 1.2s              │  │
│  │             ││  │  └─🎬 vid.mp4 │  │  └──────────────────────────────────┘  │
│  │             ││  │             │  │                                             │
│  │             ││  │             │  │  [🔄 Refresh Analysis]                    │
│  │             ││  │             │  │  [💾 Create Backup]                       │
│  │             ││  │             │  │  [🎯 Preview Changes]                     │
│  └─────────────┘│  └─────────────┘│  │                                             │
├─────────────────┴─────────────────┴─────────────────────────────────────────────┤
│ 📊 Analyzing 47 files... [██████████░░░░░░] 65% │ Ready to organize              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Dark Theme Mockup
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🗂️ AI Folder Organizer                                          [─][□][×]        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [📁 Select] [🤖 Analyze] [⚡ Apply] [⚙️ Settings]   Theme: ● Dark ○ Light        │
├─────────────────┬─────────────────┬─────────────────────────────────────────────┤
│ ░░ CURRENT ░░░░░│░░ PROPOSED ░░░░░│░░░░░░░░░ ACTIONS ░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ ░ STRUCTURE ░░░░│░ STRUCTURE ░░░░░│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│ ▓ 📁 Downloads  │▓ 📁 Downloads   │▓  ┌─ Organization Type ───────────────┐  ▓│
│ ▓ ├─📄 report.pd│▓ ├─📁 10-19 Pho │▓  │ ● Johnny Decimal System         │  ▓│
│ ▓ ├─🖼️ photo.jpg│▓ │ └─🖼️ photo.jpg│▓  │ ○ By File Type                  │  ▓│
│ ▓ ├─📊 data.xls │▓ ├─📁 20-29 Doc │▓  │ ○ By Date Created               │  ▓│
│ ▓ └─💻 setup.exe│▓ │ ├─📄 report.pd│▓  │ ○ Smart Categories              │  ▓│
│ ▓               │▓ │ └─📊 data.xlsx │▓  └─────────────────────────────────┘  ▓│
│ ▓               │▓ └─📁 30-39 Sof │▓                                        ▓│
│ ▓               │▓   └─💻 setup.exe│▓  🤖 AI Suggestions:                   ▓│
│ ▓               │▓                │▓  • Photography files → 11.01           ▓│
│ ▓               │▓                │▓  • Work documents → 21.02              ▓│
│ ▓               │▓                │▓  • Software installers → 31.01        ▓│
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
├─────────────────┴─────────────────┴─────────────────────────────────────────────┤
│ 🔍 Analysis complete │ 47 files → 4 categories │ Confidence: 94% │ 🟢 Ready    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Interactive States Mockup

#### 1. Initial State (No Folder Selected)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🗂️ AI Folder Organizer                                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [📁 Select Folder] [🤖 Analyze] [⚡ Apply] [⚙️ Settings]                        │
├─────────────────┬─────────────────┬─────────────────────────────────────────────┤
│                 │                 │                                             │
│                 │                 │     👋 Welcome to AI Folder Organizer      │
│                 │                 │                                             │
│       📂        │       📋        │     🔹 Select a folder to get started       │
│   No folder     │   No analysis   │     🔹 AI will analyze and categorize       │
│   selected      │   available     │     🔹 Review and customize the structure   │
│                 │                 │     🔹 Apply changes safely with backup     │
│                 │                 │                                             │
│   Click "Select │   Select a      │     Need help? Check the documentation      │
│   Folder" to    │   folder first  │     or watch the tutorial video.           │
│   begin         │                 │                                             │
│                 │                 │                                             │
├─────────────────┴─────────────────┴─────────────────────────────────────────────┤
│ Ready to organize your files                                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 2. Analysis in Progress
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🗂️ AI Folder Organizer                                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [📁 Select Folder] [⏸️ Pause Analysis] [⚙️ Settings]                            │
├─────────────────┬─────────────────┬─────────────────────────────────────────────┤
│  CURRENT        │     ANALYSIS    │           PROGRESS                          │
│  STRUCTURE      │   IN PROGRESS   │                                             │
│ 📁 Downloads    │                 │  🤖 Analyzing files with AI...             │
│ ├─📄 doc1.pdf   │       🔄        │                                             │
│ ├─🖼️ img1.jpg   │   Categorizing  │  Current: img1.jpg                         │
│ ├─📄 file.txt   │     files       │  Category: Photography                      │
│ ├─🎵 song.mp3   │                 │  Confidence: 87%                           │
│ ├─🎬 vid.mp4    │    Please wait  │                                             │
│ └─📦 app.zip    │    while AI     │  [████████████░░░░░░] 70%                  │
│                 │    processes    │                                             │
│                 │    your files   │  📊 Progress:                              │
│                 │                 │  • Scanned: 42/60 files                   │
│                 │                 │  • Categorized: 38 files                  │
│                 │                 │  • Categories found: 4                    │
│                 │                 │  • Time remaining: ~30s                   │
│                 │                 │                                             │
├─────────────────┴─────────────────┴─────────────────────────────────────────────┤
│ 🔍 Analyzing... │ Processing: image files │ Est. time: 2m 30s │ [Cancel]        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 3. Drag & Drop Editing Mode
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🗂️ AI Folder Organizer                                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [📁 Select Folder] [🤖 Re-analyze] [⚡ Apply Changes] [⚙️ Settings]             │
├─────────────────┬─────────────────┬─────────────────────────────────────────────┤
│  CURRENT        │  PROPOSED       │           ACTIONS                           │
│  STRUCTURE      │  STRUCTURE      │                                             │
│ 📁 Downloads    │ 📁 Downloads    │  ✏️ EDIT MODE ACTIVE                       │
│ ├─📄 doc1.pdf   │ ├─📁 10-19 P... │  Drag files between folders                │
│ ├─🖼️ img1.jpg   │ │ └─🖼️ [DRAGGED] │                                             │
│ ├─📄 file.txt   │ ├─📁 20-29 D... │  📁 Right-click to:                        │
│ ├─🎵 song.mp3   │ │ ├─📄 doc1.pdf  │  • Rename folder                           │
│ ├─🎬 vid.mp4    │ │ └─📄 file.txt  │  • Create new folder                       │
│ └─📦 app.zip    │ ├─📁 30-39 T... │  • Delete folder                           │
│                 │ │ └─📦 app.zip   │  • Move to different area                  │
│    [Drop Zone]  │ └─📁 40-49 M... │                                             │
│    Highlight    │   ├─🎵 song.mp3 │  ⚠️ Changes Preview:                       │
│    when file    │   ├─🎬 vid.mp4  │  • 6 files will be moved                   │
│    is dragged   │   └─[DROP HERE] │  • 4 new folders will be created          │
│    over         │                 │  • Original structure preserved in backup  │
│                 │                 │                                             │
├─────────────────┴─────────────────┴─────────────────────────────────────────────┤
│ 📝 Editing │ Drag img1.jpg to Media folder │ Press ESC to exit edit mode        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 User Experience Flow

### Primary User Journey
1. **Launch** → Clean, minimal interface with clear "Select Folder" button
2. **Select** → Native folder picker, supports drag & drop onto window
3. **Analyze** → Progress indicator with real-time updates, cancellable
4. **Review** → Side-by-side comparison with edit capabilities
5. **Customize** → Drag & drop editing, context menus, rename options
6. **Apply** → Safety confirmation, automatic backup, progress tracking
7. **Complete** → Success message with option to open organized folder

### Secondary Flows
- **Settings Configuration** → Model selection, theme, preferences
- **Backup Management** → View, restore, or delete previous backups
- **Organization Templates** → Save/load custom organization schemes

## 🎨 Design System

### Color Palette

#### Light Theme
```css
--bg-primary: #ffffff
--bg-secondary: #f8fafc
--bg-tertiary: #f1f5f9
--border: #e2e8f0
--text-primary: #1e293b
--text-secondary: #64748b
--accent-blue: #3b82f6
--accent-green: #10b981
--accent-orange: #f59e0b
--accent-red: #ef4444
```

#### Dark Theme
```css
--bg-primary: #0f172a
--bg-secondary: #1e293b
--bg-tertiary: #334155
--border: #475569
--text-primary: #f8fafc
--text-secondary: #cbd5e1
--accent-blue: #60a5fa
--accent-green: #34d399
--accent-orange: #fbbf24
--accent-red: #f87171
```

### Typography
```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
--font-size-xs: 0.75rem    /* 12px */
--font-size-sm: 0.875rem   /* 14px */
--font-size-base: 1rem     /* 16px */
--font-size-lg: 1.125rem   /* 18px */
--font-size-xl: 1.25rem    /* 20px */
--font-size-2xl: 1.5rem    /* 24px */
```

### Spacing & Layout
```css
--spacing-xs: 0.25rem   /* 4px */
--spacing-sm: 0.5rem    /* 8px */
--spacing-md: 1rem      /* 16px */
--spacing-lg: 1.5rem    /* 24px */
--spacing-xl: 2rem      /* 32px */
--spacing-2xl: 3rem     /* 48px */

--radius-sm: 0.25rem    /* 4px */
--radius-md: 0.5rem     /* 8px */
--radius-lg: 0.75rem    /* 12px */
```

## 🔧 Component Specifications

### Tree View Component
```typescript
interface TreeNodeProps {
  node: FileSystemNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  isDragTarget: boolean;
  isEditable: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onRename: (newName: string) => void;
  onDragStart: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}
```

#### Visual States:
- **Default**: Standard file/folder icon with name
- **Hovered**: Subtle background highlight, show action buttons
- **Selected**: Blue background, white text
- **Dragging**: Semi-transparent, show drop zones
- **Drop Target**: Highlighted border, pulsing animation
- **Editing**: Inline text input with save/cancel buttons

### Action Panel Component
```typescript
interface ActionPanelProps {
  organizationType: OrganizationType;
  llmStatus: LLMConnectionStatus;
  analysisResults: AnalysisResults;
  onOrganizationTypeChange: (type: OrganizationType) => void;
  onRefreshAnalysis: () => void;
  onCreateBackup: () => void;
  onPreviewChanges: () => void;
}
```

#### Sections:
1. **Organization Type Selector** - Radio buttons with descriptions
2. **LLM Status Indicator** - Connection status and model info
3. **AI Suggestions Panel** - Key insights and recommendations
4. **Action Buttons** - Primary actions with loading states

### Settings Modal Component
```typescript
interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  onReset: () => void;
}
```

#### Tabs:
1. **General** - Theme, language, startup behavior
2. **AI/LLM** - Model selection, server URL, timeout settings
3. **Organization** - Default rules, file type mappings
4. **Advanced** - Debug mode, performance settings, backup options

## 📱 Responsive Considerations

### Minimum Window Size: 1024x768
- Horizontal layout becomes vertical on narrow screens
- Tree views get horizontal scroll bars
- Action panel moves to bottom on small screens
- Settings modal becomes full-screen on mobile

### Accessibility Features
- Full keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Customizable font sizes
- Focus indicators on all interactive elements

## 🎭 Animation & Micro-interactions

### Tree Animations
- **Expand/Collapse**: Smooth height transition (200ms ease-out)
- **Drag & Drop**: Scale transform on drag start, smooth drop animation
- **File Move**: Fade out from source, fade in at destination

### Loading States
- **Analysis Progress**: Animated progress bar with file counts
- **File Operations**: Individual file animations during moves
- **LLM Requests**: Pulsing indicator with estimated time

### Feedback Animations
- **Success**: Green checkmark with scale animation
- **Error**: Red shake animation with error message
- **Warning**: Orange pulse for non-critical issues

This design document provides a comprehensive blueprint for building a user-friendly, AI-powered folder organization application with a clean, modern interface that prioritizes usability and efficiency.
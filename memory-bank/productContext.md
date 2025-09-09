# AI File Organizer - Product Context

## Why This Project Exists

### The Problem
- **Digital Chaos**: People accumulate thousands of files with inconsistent naming and random folder structures
- **Manual Organization**: Traditional file organization is time-consuming and subjective
- **Lack of System**: Most people don't follow consistent organizational methodologies
- **AI Dependency**: Existing solutions require cloud services and raise privacy concerns

### The Solution
An intelligent desktop application that combines:
1. **Johnny Decimal System**: A proven organizational methodology (10 areas → 100 categories → 1000 items)
2. **Local AI Analysis**: Private, fast analysis using Ollama models
3. **Smart Suggestions**: AI-powered categorization based on file content, names, and metadata
4. **Safe Operations**: Non-destructive organization with backup and undo capabilities

## How It Should Work

### User Journey
1. **Initial Setup**: User selects a directory to organize and chooses AI model preferences
2. **Scanning Phase**: App analyzes directory structure and extracts file metadata
3. **AI Analysis**: Local Ollama models suggest Johnny Decimal categories for each file
4. **Review & Customize**: User reviews suggestions and can modify before applying
5. **Organization**: App safely moves files into suggested structure with progress tracking
6. **Ongoing Management**: Continues monitoring for new files and suggests placement

### Core Workflows

#### File Discovery
- Deep directory scanning with metadata extraction
- Progress indication for large folder structures
- Intelligent filtering (hidden files, system files, etc.)

#### AI-Powered Categorization
- Content-based analysis using local LLM models
- File type and extension consideration
- Contextual naming pattern recognition
- Johnny Decimal structure generation

#### Safe Organization
- Preview mode before making changes
- Backup creation before file moves
- Undo functionality for all operations
- Conflict resolution for duplicate names

## User Experience Goals

### Primary Experience
- **Effortless**: Minimal user input required for intelligent organization
- **Transparent**: Clear visibility into what the AI is suggesting and why
- **Safe**: Users never worry about losing files or breaking existing structures
- **Fast**: Local processing ensures quick responses without network dependencies

### Interface Principles
- **Visual Tree Structure**: Clear representation of current and proposed organization
- **Progressive Disclosure**: Show details on demand without overwhelming the interface
- **Immediate Feedback**: Real-time progress and status updates
- **Contextual Help**: Guidance on Johnny Decimal principles integrated into the UI

### Success Metrics
- **Organization Speed**: Reduce manual file organization time by 80%+
- **User Confidence**: Users feel safe letting the AI suggest organization
- **Adoption**: Users continue using the system for ongoing file management
- **Accuracy**: AI suggestions align with user intent 90%+ of the time

## Target Users

### Primary: Knowledge Workers
- **Characteristics**: Handle lots of documents, projects, and digital assets
- **Pain Points**: Inconsistent organization, difficulty finding files, project handoffs
- **Goals**: Systematic organization that scales and is maintainable

### Secondary: Creative Professionals
- **Characteristics**: Work with mixed media files, multiple projects, client work
- **Pain Points**: Asset management, version control, client file organization
- **Goals**: Portfolio organization and efficient asset retrieval

### Tertiary: Personal Users
- **Characteristics**: Accumulated years of personal files, photos, documents
- **Pain Points**: Digital hoarding, inability to find specific files
- **Goals**: Clean, organized personal digital space
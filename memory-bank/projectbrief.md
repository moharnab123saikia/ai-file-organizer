# AI File Organizer - Project Brief

## Project Overview
A comprehensive desktop application that uses AI to intelligently organize files and folders using the Johnny Decimal organizational system. Built with Tauri (Rust backend) + React/TypeScript (frontend).

## Core Requirements

### Primary Goals
1. **AI-Powered Organization**: Use local Ollama models to analyze files and suggest intelligent organization structures
2. **Johnny Decimal System**: Implement the 10-area, 100-category, 1000-item organizational methodology
3. **Desktop Application**: Cross-platform desktop app with native performance
4. **Local AI**: No cloud dependencies - all AI processing happens locally via Ollama
5. **File Safety**: Never lose files - all operations are safe with backup/undo capabilities

### Key Features
- **File System Scanning**: Deep analysis of directory structures with metadata extraction
- **AI Analysis**: Intelligent categorization suggestions based on file content, names, and types
- **Johnny Decimal Engine**: Automated structure generation following JD principles
- **Visual Interface**: Intuitive tree view and organization panels
- **Progress Tracking**: Real-time feedback during organization operations
- **Settings Management**: Configurable AI models, organization preferences, and app settings

### Technical Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Tauri (Rust) for file system operations and native performance
- **AI Integration**: Ollama for local LLM processing
- **Testing**: Vitest + Playwright + Rust testing framework
- **Development**: Test-Driven Development (TDD) approach

## Success Criteria
1. Successfully organize complex folder structures using AI suggestions
2. Maintain file integrity throughout all operations
3. Provide clear visual feedback and progress indication
4. Support multiple AI models via Ollama integration
5. Cross-platform compatibility (Windows, macOS, Linux)
6. Comprehensive test coverage (>90%)

## Project Scope
- **In Scope**: Local file organization, AI-powered suggestions, Johnny Decimal implementation
- **Out of Scope**: Cloud storage integration, online AI services, file content modification
- **Future Considerations**: Plugin system, advanced AI training, network folder support

## Current Development Phase
Test-Driven Development implementation of core services and components following established architecture and type specifications.
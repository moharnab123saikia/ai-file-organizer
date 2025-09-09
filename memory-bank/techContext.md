# AI File Organizer - Technical Context

## Technologies Used

### Frontend Stack
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Strict type safety and enhanced developer experience
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Vitest**: Modern testing framework with native TypeScript support
- **Playwright**: End-to-end testing framework for cross-browser testing

### Backend Stack
- **Tauri**: Rust-based framework for building lightweight desktop applications
- **Rust**: Systems programming language for high-performance file operations
- **SQLite**: Embedded database for local data persistence
- **Serde**: Rust serialization framework for JSON handling

### AI Integration
- **Ollama**: Local LLM runtime for privacy-preserving AI operations
- **HTTP Client**: Fetch-based communication with Ollama API
- **Model Support**: Compatible with various open-source models (Llama, Mistral, etc.)

### Development Tools
- **Git**: Version control with conventional commits
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **VS Code**: Primary development environment with extensions

## Development Setup

### Prerequisites
```bash
# Required installations
Node.js 18+ 
Rust 1.70+
Ollama (for AI functionality)
Git

# Recommended VS Code extensions
- Rust Analyzer
- TypeScript Importer
- Tailwind CSS IntelliSense
- Vitest Runner
```

### Project Structure
```
ai-file-organizer/
├── src/                          # React frontend source
│   ├── components/              # React components
│   ├── services/               # Business logic services ✅
│   │   ├── file-system/        # File operations ✅
│   │   ├── ai/                 # AI integration ✅
│   │   └── organization/       # Johnny Decimal engine ✅
│   ├── types/                  # TypeScript type definitions ✅
│   └── test/                   # Test configuration ✅
├── src-tauri/                  # Rust backend
│   ├── src/                    # Rust source code
│   ├── Cargo.toml             # Rust dependencies
│   └── tauri.conf.json        # Tauri configuration
├── docs/                       # Project documentation ✅
├── memory-bank/               # Development memory bank ✅
└── tests/                     # Integration tests
```

### Build Configuration

#### Frontend (Vite)
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true
  },
  build: {
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG
  }
});
```

#### Testing (Vitest)
```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
});
```

#### Backend (Cargo.toml)
```toml
[dependencies]
tauri = { version = "1.0", features = ["api-all"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
```

## Technical Constraints

### Performance Requirements
- **Startup Time**: < 3 seconds cold start
- **File Scanning**: Handle 10,000+ files efficiently
- **Memory Usage**: < 500MB for typical workloads
- **AI Response Time**: < 10 seconds per file analysis

### Platform Support
- **Primary**: macOS (Apple Silicon + Intel)
- **Secondary**: Windows 10/11 (x64)
- **Tertiary**: Linux (Ubuntu 20.04+)

### Security Constraints
- **No Network Dependencies**: Except for local Ollama communication
- **File System Permissions**: Respect OS-level access controls
- **Privacy**: No data collection or external communication
- **Sandboxing**: Tauri security model with restricted API access

## Dependencies

### Critical Dependencies
```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "@tauri-apps/api": "^1.5.0",
  "tailwindcss": "^3.3.0",
  "vitest": "^1.6.0"
}
```

### Development Dependencies
```json
{
  "eslint": "^8.0.0",
  "prettier": "^3.0.0",
  "playwright": "^1.40.0",
  "@types/react": "^18.2.0"
}
```

### Rust Dependencies (Cargo.toml)
```toml
tauri = "1.5"
serde = "1.0"
tokio = "1.0"
walkdir = "2.3"
chrono = "0.4"
```

## Tool Usage Patterns

### Development Workflow
```bash
# Start development server
npm run tauri dev

# Run tests
npm test                 # Frontend tests
npm run test:e2e        # Playwright tests
cargo test              # Rust tests

# Build for production
npm run tauri build

# Type checking
npm run type-check
```

### Testing Strategy
1. **Unit Tests**: Vitest for service layer logic
2. **Component Tests**: React Testing Library for UI components
3. **Integration Tests**: Test service interactions
4. **E2E Tests**: Playwright for full user workflows
5. **Rust Tests**: Native Rust testing for backend operations

### Code Quality
```bash
# Linting and formatting
npm run lint
npm run format

# Pre-commit hooks (via Husky)
- TypeScript compilation check
- ESLint validation
- Prettier formatting
- Test execution
```

## API Patterns

### Tauri Command Interface
```rust
#[tauri::command]
async fn scan_directory(path: String) -> Result<FileSystemTree, String> {
    // Implementation
}
```

### Frontend Service Pattern
```typescript
// Service class with async methods
export class FileScanner {
  async scanDirectory(path: string): Promise<FileSystemTree> {
    return invoke('scan_directory', { path });
  }
}
```

### Error Handling
```typescript
// Standardized error response format
interface ServiceError {
  code: string;
  message: string;
  details?: any;
}
```

## Configuration Management

### Environment Variables
```bash
# Development
TAURI_DEBUG=true
VITE_DEV_SERVER_URL=http://localhost:1420

# Production
TAURI_PLATFORM=production
VITE_APP_VERSION=$npm_package_version
```

### Runtime Configuration
- **AI Models**: Configurable Ollama model selection
- **File Filters**: Customizable file type inclusion/exclusion
- **Performance**: Adjustable batch sizes and concurrency limits
- **UI Preferences**: Theme, layout, and display options

## Current Implementation Status

### ✅ Completed
- Project structure and build configuration
- TypeScript type system
- Service layer architecture (FileScanner, OllamaService, JohnnyDecimalEngine)
- Comprehensive test setup and patterns
- TDD methodology implementation

### 🔄 In Progress
- React component implementation
- Frontend state management
- UI component library

### 📋 Planned
- Integration testing framework
- E2E test implementation
- Performance optimization
- Cross-platform build automation
- Distribution packaging
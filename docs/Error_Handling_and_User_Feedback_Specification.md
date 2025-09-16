# Error Handling and User Feedback Specification

## 1. Overview

This document outlines the architecture for a comprehensive error handling and user feedback system for the AI File Organizer application. The goal is to create a robust, user-friendly system that provides clear, actionable feedback for all possible application states, including errors, warnings, and successful operations.

## 2. Core Principles

- **Centralized:** Errors should be handled by a central service to ensure consistency.
- **User-Centric:** Feedback should be clear, concise, and help the user understand what happened and what to do next.
- **Contextual:** Feedback should be delivered in the most appropriate way for the context (e.g., a modal for critical errors, a toast for simple confirmations).
- **Developer-Friendly:** The system should be easy for developers to use and extend.
- **Testable:** All parts of the system must be covered by unit and integration tests.

## 3. Architecture

### 3.1. Error Handling Service

A new service, `ErrorService`, will be created in `src/services/error/`.

**Responsibilities:**
- Catch and process all errors from both the Rust backend (via Tauri events) and the TypeScript frontend.
- Categorize errors (e.g., `FileSystemError`, `AIError`, `ValidationError`).
- Log errors to a persistent store for debugging.
- Trigger the appropriate user feedback mechanism based on the error's severity and context.

**Interface:**
```typescript
// src/services/error/ErrorService.ts
export interface AppError {
  id: string;
  code: string; // e.g., 'FS_READ_ONLY', 'AI_MODEL_UNAVAILABLE'
  message: string; // User-friendly message
  details?: Record<string, any>; // Technical details for logging
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
}

export class ErrorService {
  static handleError(error: Error | AppError): void;
  static logError(appError: AppError): Promise<void>;
  static subscribe(callback: (error: AppError) => void): () => void;
}
```

### 3.2. User Feedback System

The feedback system will consist of several React components located in `src/components/feedback/`.

**Components:**
- **`ToastProvider` & `useToast` hook:** For displaying short, non-blocking notifications (e.g., "File moved successfully," "Settings saved").
- **`NotificationCenter`:** A persistent area where important messages and a history of toasts are collected.
- **`ErrorModal`:** A blocking modal dialog for critical errors that require user interaction to resolve (e.g., "Unable to write to disk. Check permissions.").
- **`InlineAlert`:** A component for displaying contextual errors or warnings within a specific part of the UI (e.g., an error message next to a form field).

### 3.3. State Management

A new Zustand store, `feedbackStore`, will be created in `src/state/`.

**State:**
```typescript
interface FeedbackState {
  toasts: Toast[];
  notifications: AppError[];
  modalError: AppError | null;
  showModal: (error: AppError) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}
```

## 4. Implementation and TDD Plan

1.  **Create `ErrorService` and `feedbackStore`:**
    - Write tests for `ErrorService` to ensure it correctly processes, logs, and dispatches errors.
    - Write tests for the `feedbackStore` to verify state transitions.
2.  **Implement Feedback Components:**
    - Use TDD to build the `ToastProvider`, `NotificationCenter`, `ErrorModal`, and `InlineAlert` components.
    - Tests will cover rendering, user interactions, and accessibility.
3.  **Integrate with Application:**
    - Wrap the main `App` component with the `ToastProvider`.
    - Refactor existing `try...catch` blocks and Tauri event listeners to use `ErrorService.handleError`.
    - Implement the `ErrorModal` and `NotificationCenter` in the main application layout.

## 5. Mermaid Diagram: Error Flow

```mermaid
graph TD
    subgraph Frontend
        A[User Action] --> B{Invoke Service};
        B --> C[Service Logic];
    end

    subgraph Backend (Tauri/Rust)
        D[Rust Function]
    end

    C -->|Success| E[Update UI State];
    C -->|Frontend Error| F[try...catch block];
    B -->|Call to Backend| D;
    D -->|Backend Error| G[Emit Tauri Event];

    F --> H[ErrorService.handleError];
    G -->|Listen for Event| H;

    H --> I{Categorize & Log Error};
    I --> J[feedbackStore.showModal];
    I --> K[feedbackStore.addToast];

    J --> L[Render ErrorModal];
    K --> M[Render Toast];
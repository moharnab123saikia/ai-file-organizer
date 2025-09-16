# Application Packaging and Distribution Specification

## 1. Overview

This document details the strategy for packaging and distributing the AI File Organizer application. The primary goal is to create a streamlined, automated process for building, signing, and releasing installable application bundles for macOS, Windows, and Linux.

## 2. Core Technologies

- **Tauri:** The core framework used for building the application. Tauri's CLI provides the necessary tools for bundling the application into platform-specific formats.
- **GitHub Actions:** Used to automate the build, signing, and release process.

## 3. Platform-Specific Packaging

### 3.1. macOS

- **Bundle Format:** `.app` bundled within a `.dmg` disk image.
- **Signing:** The `.app` bundle will be signed using a macOS Developer ID certificate.
- **Notarization:** The `.dmg` will be notarized by Apple to ensure it passes Gatekeeper checks.

### 3.2. Windows

- **Bundle Format:** `.msi` installer.
- **Signing:** The `.msi` installer will be signed using a Windows Authenticode certificate.

### 3.3. Linux

- **Bundle Format:** `.AppImage` and `.deb` packages.
- **Signing:** Not applicable in the same way as macOS and Windows, but the release will be accompanied by a GPG signature.

## 4. Build and Release Process

The release process will be managed through a GitHub Actions workflow.

### 4.1. Workflow Trigger

The workflow will be triggered manually via a `workflow_dispatch` event, allowing for controlled releases.

### 4.2. Workflow Steps

1.  **Checkout Code:** The workflow will check out the latest code from the `main` branch.
2.  **Set up Environment:** It will set up the necessary build environment, including Node.js, Rust, and any platform-specific dependencies.
3.  **Install Dependencies:** `npm install` and `cargo install` will be run.
4.  **Build Application:** The `tauri build` command will be executed for each target platform (macOS, Windows, Linux).
5.  **Sign and Notarize (macOS):** The macOS build will be signed and notarized using secrets stored in GitHub.
6.  **Sign (Windows):** The Windows build will be signed using secrets stored in GitHub.
7.  **Create GitHub Release:** A new release will be created on GitHub, with the version number derived from the `package.json` file.
8.  **Upload Artifacts:** The generated `.dmg`, `.msi`, `.AppImage`, and `.deb` files will be uploaded as release artifacts.

## 5. Mermaid Diagram: Release Workflow

```mermaid
graph TD
    A[Manual Trigger: New Release] --> B[Checkout Code];
    B --> C{Set up Build Environment};
    C --> D[Install Dependencies];
    D --> E[Run Tests];
    E --> F{Build Application};
    F -->|macOS| G[Sign & Notarize];
    F -->|Windows| H[Sign Installer];
    F -->|Linux| I[Package AppImage & Deb];
    G --> J[Create GitHub Release];
    H --> J;
    I --> J;
    J --> K[Upload Artifacts];
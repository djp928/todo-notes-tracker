# Release Process Documentation

This document explains the automated release process for Todo Notes Tracker.

## Overview

The release process is fully automated using GitHub Actions and follows semantic versioning principles. When version changes are detected, the system automatically:

1. **Creates a git tag** with the new version
2. **Builds cross-platform binaries** for macOS, Windows, and Linux
3. **Creates a GitHub release** with automatic release notes
4. **Uploads build artifacts** to the release

## Supported Platforms

### macOS
- **Intel (x64)**: `x86_64-apple-darwin`
- **Apple Silicon (ARM64)**: `aarch64-apple-darwin`
- **Artifacts**: `.dmg` installer, `.app` bundle

### Windows
- **x64**: `x86_64-pc-windows-msvc`
- **Artifacts**: `.msi` installer, `.exe` executable

### Linux
- **x64**: `x86_64-unknown-linux-gnu`
- **Artifacts**: `.AppImage`, `.deb` package, standalone binary

## Release Methods

### Method 1: Manual Version Bump (Recommended)

Use the GitHub Actions workflow for controlled releases:

1. Go to **Actions** → **Version Bump** → **Run workflow**
2. Choose version bump type:
   - `patch`: Bug fixes (1.0.0 → 1.0.1)
   - `minor`: New features (1.0.0 → 1.1.0)
   - `major`: Breaking changes (1.0.0 → 2.0.0)
3. Optional: Specify custom version
4. The workflow will:
   - Update version in all files
   - Create a pull request (if not on main)
   - Trigger release when merged to main

### Method 2: Direct Version Update

Manually update the version in these files:
- `src-tauri/tauri.conf.json` → `"version": "x.x.x"`
- `src-tauri/Cargo.toml` → `version = "x.x.x"`
- `ui/index.html` → `<span id="app-version">vx.x.x</span>`

When pushed to main, the release will trigger automatically.

## Release Workflow Details

### Trigger Conditions
- Push to `main` branch
- Version change detected in `tauri.conf.json`
- Excludes documentation-only changes

### Build Matrix
The workflow builds for all supported platforms in parallel:
```yaml
matrix:
  include:
    - platform: 'macos-latest'
      target: 'x86_64-apple-darwin'
    - platform: 'macos-latest' 
      target: 'aarch64-apple-darwin'
    - platform: 'ubuntu-latest'
      target: 'x86_64-unknown-linux-gnu'
    - platform: 'windows-latest'
      target: 'x86_64-pc-windows-msvc'
```

### Artifact Generation
Each platform generates appropriate installers:
- **macOS**: DMG installer with app bundle
- **Windows**: MSI installer package
- **Linux**: AppImage and DEB packages

### Release Notes
Automatically generated including:
- Commit history since last release
- Download instructions for each platform
- Installation guides
- Feature highlights

## Versioning Guidelines

Follow [Semantic Versioning](https://semver.org/):

### MAJOR (x.0.0)
Breaking changes that require user intervention:
- Data format changes
- API breaking changes
- Removed features

### MINOR (1.x.0)
New features that are backward compatible:
- New UI features
- New functionality
- Performance improvements

### PATCH (1.0.x)
Bug fixes and minor improvements:
- Bug fixes
- UI tweaks
- Documentation updates

## Release Security

### Permissions
The release workflow has minimal required permissions:
```yaml
permissions:
  contents: write      # Create releases and tags
  pull-requests: write # Create PRs for version bumps
  issues: write        # Update issue references
```

### Artifact Signing
- **macOS**: Apps are signed during build (if certificates configured)
- **Windows**: MSI packages can be signed (if certificates configured)
- **Linux**: Packages include checksums for verification

## Troubleshooting

### Release Not Triggered
- Check that version in `tauri.conf.json` has changed
- Ensure push is to `main` branch
- Verify no paths are excluded in workflow

### Build Failures
- Check platform-specific dependencies
- Review build logs in Actions tab
- Ensure Rust targets are available

### Artifact Issues
- Verify Tauri configuration is correct
- Check bundle settings in `tauri.conf.json`
- Review artifact upload paths

## Manual Release Override

To create a release without version changes:
```bash
# Force trigger by updating version
git tag v1.0.0-manual
git push origin v1.0.0-manual
```

Or run the release workflow manually from the Actions tab.

## Monitoring

### GitHub Actions
- Monitor workflow runs in the **Actions** tab
- Check build status for each platform
- Review artifact uploads and sizes

### Release Quality
- Test downloaded artifacts on each platform
- Verify installation processes
- Check application functionality post-install

## Best Practices

1. **Test Before Release**: Always test locally before version bumps
2. **Clear Commit Messages**: Helps with automatic release notes
3. **Platform Testing**: Test builds on target platforms when possible
4. **Version Consistency**: Keep all version references synchronized
5. **Release Notes**: Review and edit generated release notes if needed

## Example Release Flow

1. **Development**: Work on feature branch
2. **Testing**: Merge to main via PR (tests run automatically)
3. **Version Bump**: Use GitHub Actions workflow
4. **Review**: Check generated PR for version bump
5. **Release**: Merge PR to trigger automated release
6. **Verify**: Download and test released artifacts

This process ensures consistent, reliable releases with comprehensive platform support.
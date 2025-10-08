# Release Workflow Architecture

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         TRIGGER CONDITIONS                       │
│  • Tests workflow completed successfully on main branch          │
│  • Manual workflow_dispatch                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JOB 1: VERSION CHECK                          │
│  • Get latest git tag                                            │
│  • Compare with tauri.conf.json version                          │
│  • Determine if release needed                                   │
│  • Output: should-release, new-version, version-type             │
└──────────────┬──────────────────────────────────────────────────┘
               │
               │ (if should-release == true)
               │
               ├────────────────────┬─────────────────────┐
               ▼                    ▼                     ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  JOB 2: BINARIES     │ │  JOB 3: BUNDLES      │ │                      │
│  (rust-build action) │ │  (Tauri CLI)         │ │   Run in parallel    │
├──────────────────────┤ ├──────────────────────┤ │                      │
│ • macOS x86_64       │ │ • macOS x86_64       │ │                      │
│ • macOS aarch64      │ │ • macOS aarch64      │ │                      │
│ • Linux x86_64       │ │ • Linux x86_64       │ │                      │
│ • Windows x86_64     │ │ • Windows x86_64     │ │                      │
├──────────────────────┤ ├──────────────────────┤ └──────────────────────┘
│ Outputs:             │ │ Outputs:             │
│ • Raw executables    │ │ • DMG (macOS)        │
│ • Named by target    │ │ • MSI (Windows)      │
│                      │ │ • AppImage (Linux)   │
│                      │ │ • DEB (Linux)        │
└──────────┬───────────┘ └───────────┬──────────┘
           │                         │
           │                         │
           └──────────┬──────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 JOB 4: CREATE RELEASE                            │
│  • Download all artifacts (binaries + bundles)                   │
│  • Generate release notes from commits                           │
│  • Create git tag (v{version})                                   │
│  • Create GitHub release                                         │
│  • Upload all artifacts to release                               │
└─────────────────────────────────────────────────────────────────┘
```

## Job Dependencies

```
version (always runs first)
  │
  ├─── build-binaries (parallel)
  │
  ├─── build-bundles (parallel)
  │
  └─── create-release (waits for both)
```

## Timing Comparison

### Before (Sequential in Single Job)
```
┌──────────────────────────────────────────────────┐
│ macOS x64 build       │ ████████████████ 15 min  │
│ macOS ARM64 build     │ ████████████████ 15 min  │
│ Linux build           │ ████████████     12 min  │
│ Windows build         │ ████████████████ 15 min  │
└──────────────────────────────────────────────────┘
Total: ~57 minutes (sequential)
```

### After (Parallel Jobs)
```
┌──────────────────────────────────────────────────┐
│ All binary builds     │ ████████████     ~15 min │ (parallel)
│ All bundle builds     │ █████████████    ~18 min │ (parallel)
│ Release creation      │ ██               ~3 min  │
└──────────────────────────────────────────────────┘
Total: ~36 minutes (parallel execution)
```

**Time saved: ~37% reduction** (21 minutes faster)

## Key Improvements

### 1. rust-build.action Benefits
- ✅ Automatic toolchain setup
- ✅ Built-in caching strategies
- ✅ Cross-compilation optimization
- ✅ Community-maintained reliability
- ✅ Reduced workflow complexity

### 2. Job Separation Benefits
- ✅ Parallel execution (faster)
- ✅ Independent failure handling
- ✅ Better cache utilization per job type
- ✅ Clearer logs for debugging
- ✅ Modular testing and updates

### 3. Artifact Organization
```
release-artifacts/
├── binary-x86_64-apple-darwin/
│   └── todo-notes-tracker-x86_64-apple-darwin
├── binary-aarch64-apple-darwin/
│   └── todo-notes-tracker-aarch64-apple-darwin
├── binary-x86_64-unknown-linux-gnu/
│   └── todo-notes-tracker-x86_64-unknown-linux-gnu
├── binary-x86_64-pc-windows-msvc/
│   └── todo-notes-tracker-x86_64-pc-windows-msvc.exe
├── bundle-x86_64-apple-darwin/
│   ├── Todo Notes Tracker.dmg
│   └── Todo Notes Tracker.app
├── bundle-aarch64-apple-darwin/
│   ├── Todo Notes Tracker.dmg
│   └── Todo Notes Tracker.app
├── bundle-x86_64-unknown-linux-gnu/
│   ├── todo-notes-tracker.AppImage
│   └── todo-notes-tracker_1.1.1_amd64.deb
└── bundle-x86_64-pc-windows-msvc/
    ├── todo-notes-tracker_1.1.1_x64.msi
    └── todo-notes-tracker-setup.exe
```

## Failure Handling

### If Binary Build Fails
- Bundle jobs continue independently
- Can investigate binary job in isolation
- Quick iteration on binary fixes

### If Bundle Build Fails
- Binary artifacts still available
- Users can download raw executables
- Bundle can be fixed without recompiling

### If Release Creation Fails
- All build artifacts already uploaded
- Can manually create release
- Retry without rebuilding

## Future Enhancements

### Potential Optimizations
1. **Universal macOS Binary**: Combine x86_64 + aarch64 using `lipo`
2. **Incremental Builds**: Cache target directory across runs
3. **Parallel Bundling**: Further split bundle creation by platform
4. **Code Signing**: Add signing for macOS and Windows
5. **Auto-update Manifests**: Generate update manifests automatically

### Additional Platforms
- ARM64 Linux (Raspberry Pi)
- ARM64 Windows
- FreeBSD support
- Web Assembly target

## Rollback Strategy

If issues arise with the new workflow:

```bash
# Option 1: Revert the commit
git revert <commit-hash>
git push origin main

# Option 2: Restore old workflow
git show HEAD~1:.github/workflows/release.yml > .github/workflows/release.yml
git commit -m "chore: rollback to previous release workflow"
git push origin main
```

The old workflow is preserved in git history for easy restoration.

## Monitoring

### Success Indicators
- ✅ All 4 jobs complete successfully
- ✅ 8 artifact sets uploaded (4 binary + 4 bundle)
- ✅ GitHub release created with all artifacts
- ✅ Release notes generated correctly
- ✅ Git tag created

### Failure Investigation
1. Check job logs in Actions tab
2. Download artifacts for inspection
3. Review error messages
4. Test locally with same target
5. Verify dependencies and versions

## Resources

- [rust-build.action GitHub](https://github.com/rust-build/rust-build.action)
- [Tauri Build Guide](https://tauri.app/v1/guides/building/)
- [GitHub Actions Matrix Strategy](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [Semantic Versioning](https://semver.org/)


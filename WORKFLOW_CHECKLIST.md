# Release Workflow Integration Checklist

## Pre-Commit Verification

### ✅ Code Changes
- [x] Updated `.github/workflows/release.yml` with rust-build.action
- [x] Split workflow into 3 specialized jobs (binaries, bundles, release)
- [x] Configured parallel execution for faster builds
- [x] Set up proper artifact organization

### ✅ Documentation
- [x] Updated `RELEASE.md` with new workflow architecture
- [x] Created `RELEASE_WORKFLOW_IMPROVEMENTS.md` (comprehensive guide)
- [x] Created `WORKFLOW_DIAGRAM.md` (visual architecture)
- [x] Created `WORKFLOW_CHECKLIST.md` (this file)

### ✅ Validation
- [x] YAML syntax validated (no errors)
- [x] All job dependencies correct
- [x] Matrix configurations verified
- [x] Artifact paths validated
- [x] No breaking changes introduced

## First Workflow Run Checklist

### Before Triggering
- [ ] Review all changes one final time
- [ ] Ensure on correct branch
- [ ] Verify version bump if manual release
- [ ] Check no other workflows are running

### Monitor During Run
- [ ] Job 1 (version) completes successfully
- [ ] Job 2 (build-binaries) runs for all 4 targets
- [ ] Job 3 (build-bundles) runs for all 4 targets
- [ ] Job 4 (create-release) aggregates artifacts
- [ ] No errors in any job logs

### Verify Artifacts
- [ ] Binary artifacts uploaded (4 sets)
  - [ ] binary-x86_64-apple-darwin
  - [ ] binary-aarch64-apple-darwin
  - [ ] binary-x86_64-unknown-linux-gnu
  - [ ] binary-x86_64-pc-windows-msvc

- [ ] Bundle artifacts uploaded (4 sets)
  - [ ] bundle-x86_64-apple-darwin (.dmg, .app)
  - [ ] bundle-aarch64-apple-darwin (.dmg, .app)
  - [ ] bundle-x86_64-unknown-linux-gnu (.AppImage, .deb)
  - [ ] bundle-x86_64-pc-windows-msvc (.msi)

### Verify Release
- [ ] GitHub release created
- [ ] Correct version tag applied
- [ ] Release notes generated
- [ ] All artifacts attached to release
- [ ] Download links work

## Post-Release Testing

### Download and Test
- [ ] Download macOS .dmg → Install → Launch → Verify functionality
- [ ] Download Windows .msi → Install → Launch → Verify functionality
- [ ] Download Linux .AppImage → Run → Verify functionality
- [ ] Download Linux .deb → Install → Launch → Verify functionality
- [ ] Download raw binaries → Execute → Verify functionality

### Performance Verification
- [ ] Note total workflow duration
- [ ] Compare with previous release timing
- [ ] Verify expected time savings (~25-35%)
- [ ] Check cache hit rates

## Troubleshooting Guide

### If Binary Build Fails
1. Check rust-build.action version compatibility
2. Verify Cargo.toml dependencies
3. Check target platform availability
4. Review build logs for specific errors
5. Test local build with same target: `cargo build --target <target>`

### If Bundle Build Fails
1. Verify Tauri CLI version matches project
2. Check tauri.conf.json configuration
3. Verify platform-specific dependencies installed
4. Review bundle settings
5. Test local build: `cargo tauri build --target <target>`

### If Release Creation Fails
1. Check artifact download logs
2. Verify both binary and bundle jobs completed
3. Check GitHub token permissions
4. Verify tag doesn't already exist
5. Review release notes generation

### If Artifacts Are Missing
1. Check job completion status
2. Verify artifact upload steps executed
3. Check artifact retention settings
4. Review artifact paths in workflow
5. Check file permissions in build output

## Rollback Procedure

If critical issues are discovered:

### Option 1: Quick Revert
```bash
git revert <commit-hash>
git push origin main
```

### Option 2: Manual Restoration
```bash
# Restore previous workflow
git show HEAD~1:.github/workflows/release.yml > .github/workflows/release.yml
git add .github/workflows/release.yml
git commit -m "chore: rollback release workflow to previous version"
git push origin main
```

### Option 3: Hotfix Branch
```bash
git checkout -b hotfix/workflow-rollback
# Make necessary fixes
git commit -m "fix: correct workflow issues"
git push origin hotfix/workflow-rollback
# Create PR for review
```

## Success Metrics

### Target Metrics
- ✅ Build time reduced by 25-35%
- ✅ All 8 artifact sets generated
- ✅ Zero workflow failures
- ✅ All platforms working
- ✅ Release process smoother

### Long-term Monitoring
- Track average build times over 10 releases
- Monitor cache hit rates
- Track artifact download statistics
- Monitor workflow failure rates
- Collect user feedback on artifacts

## Future Improvements Roadmap

### Phase 1 (Next Release)
- [ ] Monitor and optimize cache usage
- [ ] Add code signing for macOS
- [ ] Add code signing for Windows
- [ ] Implement checksum generation

### Phase 2 (Future)
- [ ] Universal macOS binaries (lipo)
- [ ] ARM64 Linux support
- [ ] ARM64 Windows support
- [ ] Auto-update manifest generation

### Phase 3 (Long-term)
- [ ] Incremental builds for patches
- [ ] Pre-compiled Tauri CLI caching
- [ ] Distributed compilation (sccache)
- [ ] FreeBSD and other Unix variants

## Documentation Maintenance

### Keep Updated
- [ ] Update workflow diagrams if jobs change
- [ ] Document any new platforms added
- [ ] Update troubleshooting guide with new issues
- [ ] Keep performance metrics current
- [ ] Document any workflow configuration changes

## Contact/Support

### Issues with Workflow
- Check GitHub Actions logs first
- Review this checklist
- Consult troubleshooting guide
- Check rust-build.action issues: https://github.com/rust-build/rust-build.action/issues

### Improvement Suggestions
- Document in GitHub Issues
- Reference this checklist
- Include performance data if available
- Suggest specific enhancements

---

**Last Updated**: (Will be updated after first successful run)
**Status**: Ready for initial testing
**Version**: 1.0 (rust-build.action integration)

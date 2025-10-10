# Automated Versioning Implementation Proposal

## Current State

The project uses a **semi-automatic** release process:
- ✅ **Automatic**: Release builds, GitHub releases, cross-platform installers
- ❌ **Manual**: Version number selection and file updates

### Current Process
1. Developer merges PR with conventional commits
2. **Manual step**: Developer runs `version-bump.yml` workflow via GitHub UI
3. Developer selects version type (major/minor/patch)
4. Workflow creates version bump PR
5. Developer merges version bump PR
6. **Automatic**: Release builds and publishes

## Problem

The `.github/copilot-instructions.md` states:
> "Workflow automatically analyzes commits since last tag"
> "Version is bumped based on commit types"

**Reality**: This is aspirational. The workflow does not analyze conventional commits or automatically determine version bumps.

## Proposed Solution

Implement **fully automatic** versioning using one of these proven tools:

---

## Option 1: semantic-release (Recommended)

### Why semantic-release?
- ✅ Industry standard (30k+ GitHub stars)
- ✅ Analyzes conventional commits automatically
- ✅ Determines version bump type (major/minor/patch)
- ✅ Updates CHANGELOG.md automatically
- ✅ Creates git tags and releases
- ✅ Highly configurable with plugins
- ✅ Works with monorepos

### Implementation

**1. Install Dependencies**
```bash
npm install --save-dev semantic-release
npm install --save-dev @semantic-release/changelog
npm install --save-dev @semantic-release/git
npm install --save-dev @semantic-release/github
npm install --save-dev @semantic-release/exec
```

**2. Create `.releaserc.json`**
```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/exec",
      {
        "prepareCmd": "sed -i 's/\"version\": \".*\"/\"version\": \"${nextRelease.version}\"/' src-tauri/tauri.conf.json && sed -i 's/^version = \".*\"/version = \"${nextRelease.version}\"/' src-tauri/Cargo.toml && cd src-tauri && cargo update -p todo-notes-tracker"
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": [
          "CHANGELOG.md",
          "src-tauri/tauri.conf.json",
          "src-tauri/Cargo.toml",
          "src-tauri/Cargo.lock"
        ],
        "message": "chore(release): bump version to v${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

**3. Update `.github/workflows/release.yml`**

Add semantic-release step before building:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'

- name: Install semantic-release
  run: npm install --save-dev semantic-release @semantic-release/changelog @semantic-release/git @semantic-release/github @semantic-release/exec

- name: Run semantic-release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npx semantic-release
```

**4. Remove manual version-bump.yml workflow**

The manual workflow becomes obsolete.

---

## Option 2: release-please (Google's Solution)

### Why release-please?
- ✅ Maintained by Google
- ✅ Language-agnostic (works with Rust, Go, Node, etc.)
- ✅ Creates "release PRs" that accumulate changes
- ✅ Updates CHANGELOG.md automatically
- ✅ Minimal configuration
- ✅ Native GitHub Actions integration

### Implementation

**1. Create `.github/workflows/release-please.yml`**
```yaml
name: Release Please

on:
  push:
    branches:
      - main

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: google-github-actions/release-please-action@v4
        id: release
        with:
          release-type: rust
          package-name: todo-notes-tracker
          
      # When release PR is merged, trigger builds
      - name: Checkout
        if: ${{ steps.release.outputs.release_created }}
        uses: actions/checkout@v4
        
      # Trigger existing release workflow
      - name: Trigger release build
        if: ${{ steps.release.outputs.release_created }}
        run: gh workflow run release.yml
        env:
          GH_TOKEN: ${{ github.token }}
```

**2. Create `.release-please-manifest.json`**
```json
{
  ".": "1.9.0"
}
```

**3. Create `.release-please-config.json`**
```json
{
  "packages": {
    ".": {
      "release-type": "rust",
      "package-name": "todo-notes-tracker",
      "changelog-path": "CHANGELOG.md",
      "extra-files": [
        "src-tauri/tauri.conf.json"
      ]
    }
  }
}
```

---

## Option 3: Custom Script (Lightweight)

For minimal external dependencies, implement a custom Node.js script.

### Implementation

**1. Create `scripts/auto-version.js`**
```javascript
const fs = require('fs');
const { execSync } = require('child_process');

// Get latest tag
const latestTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
const currentVersion = latestTag.replace('v', '');

// Get commits since last tag
const commits = execSync(`git log ${latestTag}..HEAD --pretty=format:"%s"`, { encoding: 'utf-8' })
  .split('\n')
  .filter(Boolean);

// Analyze commits
let versionBump = 'none';
commits.forEach(commit => {
  if (commit.includes('BREAKING CHANGE') || commit.startsWith('feat!:') || commit.startsWith('fix!:')) {
    versionBump = 'major';
  } else if (versionBump !== 'major' && commit.startsWith('feat:')) {
    versionBump = 'minor';
  } else if (versionBump === 'none' && (commit.startsWith('fix:') || commit.startsWith('perf:'))) {
    versionBump = 'patch';
  }
});

if (versionBump === 'none') {
  console.log('No version bump needed');
  process.exit(0);
}

// Calculate new version
const [major, minor, patch] = currentVersion.split('.').map(Number);
let newVersion;
if (versionBump === 'major') newVersion = `${major + 1}.0.0`;
else if (versionBump === 'minor') newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

console.log(`Bumping version: ${currentVersion} → ${newVersion} (${versionBump})`);

// Update files
const tauriConf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf-8'));
tauriConf.version = newVersion;
fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(tauriConf, null, 2));

const cargoToml = fs.readFileSync('src-tauri/Cargo.toml', 'utf-8');
const updatedCargoToml = cargoToml.replace(/^version = ".*"/m, `version = "${newVersion}"`);
fs.writeFileSync('src-tauri/Cargo.toml', updatedCargoToml);

// Update Cargo.lock
execSync('cd src-tauri && cargo update -p todo-notes-tracker', { stdio: 'inherit' });

console.log(`✅ Version updated to ${newVersion}`);
```

**2. Update `.github/workflows/release.yml`**
```yaml
- name: Auto-version
  run: node scripts/auto-version.js
  
- name: Commit version bump
  if: success()
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock
    git commit -m "chore(release): bump version [skip ci]" || echo "No changes"
    git push
```

---

## Comparison Matrix

| Feature | semantic-release | release-please | Custom Script |
|---------|-----------------|----------------|---------------|
| Automatic version detection | ✅ | ✅ | ✅ |
| CHANGELOG generation | ✅ | ✅ | ❌ (manual) |
| Conventional commit parsing | ✅ | ✅ | ✅ (basic) |
| Plugin ecosystem | ✅ Extensive | ❌ Limited | ✅ Fully customizable |
| Configuration complexity | Medium | Low | Low |
| Maintenance burden | Low | Low | Medium |
| GitHub integration | ✅ | ✅ Native | ✅ |
| Multi-file updates | ✅ | ⚠️ Limited | ✅ |
| Community support | ✅ Large | ✅ Growing | ❌ Self-maintained |

---

## Recommendation

**Use semantic-release** for this project because:

1. **Already using conventional commits** - The team follows the convention
2. **Tauri-specific needs** - Need to update multiple files (Cargo.toml, tauri.conf.json, Cargo.lock)
3. **Flexibility** - Extensive plugin ecosystem for future needs
4. **Proven track record** - Used by thousands of projects
5. **CHANGELOG automation** - Already manually maintaining CHANGELOG.md

### Migration Path

**Phase 1: Setup (1-2 hours)**
1. Install semantic-release and plugins
2. Create `.releaserc.json` configuration
3. Test on a feature branch

**Phase 2: Integration (1 hour)**
1. Update `release.yml` workflow
2. Remove `version-bump.yml` workflow
3. Update documentation

**Phase 3: Validation (1 hour)**
1. Test with a dummy release
2. Verify all files update correctly
3. Confirm builds trigger properly

**Total effort**: ~3-4 hours

---

## Alternative: Keep Current System

If automation is not a priority, the current semi-automatic system works well:

**Pros:**
- ✅ Already working
- ✅ Full control over version numbers
- ✅ No new dependencies
- ✅ Simple to understand

**Cons:**
- ❌ Manual workflow trigger required
- ❌ Easy to forget version bump
- ❌ Documentation claims automation that doesn't exist
- ❌ Extra PR for every release

---

## Decision Required

Choose one:
- [ ] **Option 1**: Implement semantic-release (recommended)
- [ ] **Option 2**: Implement release-please (simpler)
- [ ] **Option 3**: Custom script (minimal dependencies)
- [ ] **Option 4**: Keep current semi-automatic system and update docs

---

## Additional Resources

- **semantic-release**: https://github.com/semantic-release/semantic-release
- **release-please**: https://github.com/googleapis/release-please
- **Conventional Commits**: https://www.conventionalcommits.org/
- **Tauri Release Process**: https://tauri.app/v1/guides/distribution/

---

## Next Steps

1. Review this proposal
2. Choose an option
3. If implementing automation:
   - Create feature branch
   - Implement chosen solution
   - Test thoroughly
   - Update documentation
   - Train team on new process

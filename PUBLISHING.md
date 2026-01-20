# Publishing Guide

This document explains how to publish lambda-lift to npm, PyPI, and Go.

## Prerequisites

Before publishing, you need to set up the following secrets in your GitHub repository:

1. **NPM_TOKEN**: Your npm authentication token
   - Get it from https://www.npmjs.com/settings/[username]/tokens
   - Create a new "Automation" token
   - Add it as a repository secret: Settings → Secrets → Actions → New repository secret

2. **PYPI_TOKEN**: Your PyPI API token
   - Get it from https://pypi.org/manage/account/token/
   - Add it as a repository secret

## Publishing Process

The publishing process is fully automated via GitHub Actions. To publish a new version:

1. **Update the version** in relevant files:

   ```bash
   # Update version in package.json
   npm version patch  # or minor, or major

   # The version in Python and Go will be automatically updated by the workflow
   ```

2. **Create and push a git tag**:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. **The GitHub Action will automatically**:
   - Build the TypeScript code
   - Generate standalone binaries for Linux, macOS, and Windows
   - Publish to npm registry
   - Publish to PyPI
   - Create a GitHub Release with binaries
   - Update the Go module (which can be installed via `go install`)

## Manual Publishing (if needed)

### npm

```bash
pnpm install
pnpm run build
pnpm publish
```

### PyPI

```bash
cd python
python -m pip install --upgrade build twine
python -m build
twine upload dist/*
```

### Go

Go modules are published automatically when you create a git tag. Users can install with:

```bash
go install github.com/marnautoupages/lambda-lift@latest
```

## Verification

After publishing, verify the installations:

```bash
# npm
npx lambda-lift --help

# Python
pip install lambda-lift
lambda-lift --help

# Go
go install github.com/marnautoupages/lambda-lift@latest
lambda-lift --help
```

## Troubleshooting

- **npm publish fails**: Ensure you have the correct permissions and NPM_TOKEN is valid
- **PyPI publish fails**: Check that PYPI_TOKEN is correct and you haven't already published this version
- **Go install fails**: Ensure the git tag is pushed and the GitHub release is created

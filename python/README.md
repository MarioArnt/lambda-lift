# Python Package for lambda-lift

This directory contains the Python wrapper for lambda-lift, allowing Python developers to use lambda-lift without needing Node.js installed.

## Installation

```bash
pip install lambda-lift
```

## How it works

The Python package provides a smart wrapper that:

1. **First tries to use npx** (if Node.js is installed) - This is the preferred method as it ensures compatibility with the latest features
2. **Falls back to standalone binary** - If Node.js is not available, it downloads and uses a platform-specific binary

This hybrid approach ensures the best experience for all users:

- Node.js users get seamless integration with the npm ecosystem
- Python-only users get a working installation without extra dependencies

## Development

To test the Python package locally:

```bash
cd python
pip install -e .
lambda-lift --help
```

## Publishing

The Python package is automatically published to PyPI when a new git tag is created. See [../PUBLISHING.md](../PUBLISHING.md) for details.

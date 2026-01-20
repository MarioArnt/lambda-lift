# Lambda Lift - Go Wrapper

This is the Go wrapper for lambda-lift. It provides a seamless installation experience for Go developers.

## Installation

```bash
go install github.com/marnautoupages/lambda-lift@latest
```

## Usage

Once installed, you can use `lambda-lift` directly:

```bash
lambda-lift deploy ENV=prod
```

The wrapper will:

1. First try to use `npx lambda-lift` if Node.js is installed (recommended for best compatibility)
2. Otherwise, download and cache the appropriate binary for your platform
3. Execute lambda-lift with your arguments

## How it works

The Go wrapper is a thin CLI wrapper that delegates to the actual lambda-lift implementation. It ensures you can install and use lambda-lift in Go projects without requiring Node.js as a direct dependency.

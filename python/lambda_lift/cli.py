#!/usr/bin/env python3
"""
CLI wrapper for lambda-lift.
This module provides a Python entry point that delegates to either:
1. The npm version via npx (if Node.js is installed)
2. A standalone binary (downloaded during installation)
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path


def find_binary():
    """Find the lambda-lift binary in the system."""
    # Check if we're in a development environment
    if os.environ.get("LAMBDA_LIFT_DEV"):
        dev_binary = Path(__file__).parent.parent.parent.parent / "dist" / "lambda-lift"
        if dev_binary.exists():
            return str(dev_binary)
    
    # Check for binary in the same directory as this script
    script_dir = Path(__file__).parent
    binary_name = "lambda-lift.exe" if sys.platform == "win32" else "lambda-lift"
    local_binary = script_dir / binary_name
    
    if local_binary.exists():
        return str(local_binary)
    
    # Check in site-packages scripts directory
    scripts_dir = Path(sys.executable).parent
    if sys.platform == "win32":
        scripts_binary = scripts_dir / "Scripts" / "lambda-lift.exe"
    else:
        scripts_binary = scripts_dir / "lambda-lift"
    
    if scripts_binary.exists():
        return str(scripts_binary)
    
    return None


def main():
    """Main entry point for the lambda-lift CLI."""
    args = sys.argv[1:]
    
    # Strategy 1: Try using npx (preferred if Node.js is available)
    if shutil.which("npx"):
        try:
            result = subprocess.run(
                ["npx", "lambda-lift"] + args,
                check=False
            )
            sys.exit(result.returncode)
        except FileNotFoundError:
            pass  # Fall through to binary
    
    # Strategy 2: Try using the standalone binary
    binary_path = find_binary()
    if binary_path:
        try:
            result = subprocess.run(
                [binary_path] + args,
                check=False
            )
            sys.exit(result.returncode)
        except FileNotFoundError:
            pass
    
    # Strategy 3: Fail with helpful message
    print("Error: lambda-lift is not properly installed.", file=sys.stderr)
    print("", file=sys.stderr)
    print("To fix this, try one of the following:", file=sys.stderr)
    print("  1. Install Node.js and run: npm install -g lambda-lift", file=sys.stderr)
    print("  2. Reinstall this package: pip install --force-reinstall lambda-lift", file=sys.stderr)
    print("  3. Download the binary manually from:", file=sys.stderr)
    print("     https://github.com/marnautoupages/lambda-lift/releases", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()

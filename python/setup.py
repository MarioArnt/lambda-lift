import os
import platform
import stat
import subprocess
import sys
from pathlib import Path
from setuptools import setup, find_packages
from setuptools.command.install import install


class PostInstallCommand(install):
    """Post-installation command to download binary if npx is not available."""
    
    def run(self):
        install.run(self)
        
        # Check if npx is available
        try:
            subprocess.run(["npx", "--version"], check=True, capture_output=True)
            print("✓ npx detected - lambda-lift will use the npm version")
            return
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("npx not found - downloading standalone binary...")
        
        # Download appropriate binary
        self._download_binary()
    
    def _download_binary(self):
        """Download the appropriate binary for the current platform."""
        import urllib.request
        import tarfile
        import zipfile
        
        system = platform.system().lower()
        machine = platform.machine().lower()
        
        # Map platform to binary name
        binary_map = {
            ("linux", "x86_64"): "lambda-lift-linux-x64",
            ("darwin", "x86_64"): "lambda-lift-macos-x64",
            ("darwin", "arm64"): "lambda-lift-macos-arm64",
            ("windows", "amd64"): "lambda-lift-win-x64.exe",
            ("windows", "x86_64"): "lambda-lift-win-x64.exe",
        }
        
        binary_name = binary_map.get((system, machine))
        if not binary_name:
            print(f"Warning: No binary available for {system}/{machine}")
            print("Please install Node.js and use: npm install -g lambda-lift")
            return
        
        # Get version from environment or package
        version = os.environ.get("LAMBDA_LIFT_VERSION", "latest")
        
        # Download URL
        base_url = f"https://github.com/marnautoupages/lambda-lift/releases/download/v{version}"
        binary_url = f"{base_url}/{binary_name}"
        
        # Download location
        bin_dir = Path(self.install_scripts)
        bin_dir.mkdir(parents=True, exist_ok=True)
        binary_path = bin_dir / ("lambda-lift.exe" if system == "windows" else "lambda-lift")
        
        try:
            print(f"Downloading {binary_url}...")
            urllib.request.urlretrieve(binary_url, binary_path)
            
            # Make executable on Unix systems
            if system != "windows":
                st = os.stat(binary_path)
                os.chmod(binary_path, st.st_mode | stat.S_IEXEC)
            
            print(f"✓ Binary installed to {binary_path}")
        except Exception as e:
            print(f"Warning: Failed to download binary: {e}")
            print("Please install Node.js and use: npm install -g lambda-lift")


setup(
    name="lambda-lift",
    version="0.1.0",
    description="A utility to streamline AWS Lambda function deployments",
    long_description=open("../README.md").read(),
    long_description_content_type="text/markdown",
    author="Marwan Eddabaa",
    author_email="",
    url="https://github.com/marnautoupages/lambda-lift",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "lambda-lift=lambda_lift.cli:main",
        ],
    },
    cmdclass={
        "install": PostInstallCommand,
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Build Tools",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    keywords="aws lambda deployment serverless cli",
    project_urls={
        "Bug Reports": "https://github.com/marnautoupages/lambda-lift/issues",
        "Source": "https://github.com/marnautoupages/lambda-lift",
    },
)

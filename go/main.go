package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

const (
	version    = "0.1.0"
	repository = "marnautoupages/lambda-lift"
)

// getBinaryName returns the appropriate binary name for the current platform
func getBinaryName() string {
	goos := runtime.GOOS
	goarch := runtime.GOARCH

	switch goos {
	case "linux":
		if goarch == "amd64" {
			return "lambda-lift-linux-x64"
		}
	case "darwin":
		if goarch == "amd64" {
			return "lambda-lift-macos-x64"
		} else if goarch == "arm64" {
			return "lambda-lift-macos-arm64"
		}
	case "windows":
		if goarch == "amd64" {
			return "lambda-lift-win-x64.exe"
		}
	}

	return ""
}

// downloadBinary downloads the binary for the current platform
func downloadBinary(binaryPath string) error {
	binaryName := getBinaryName()
	if binaryName == "" {
		return fmt.Errorf("unsupported platform: %s/%s", runtime.GOOS, runtime.GOARCH)
	}

	url := fmt.Sprintf("https://github.com/%s/releases/download/v%s/%s", repository, version, binaryName)

	fmt.Printf("Downloading lambda-lift binary from %s...\n", url)

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download binary: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download binary: HTTP %d", resp.StatusCode)
	}

	// Create directory if it doesn't exist
	dir := filepath.Dir(binaryPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Create the binary file
	out, err := os.Create(binaryPath)
	if err != nil {
		return fmt.Errorf("failed to create binary file: %w", err)
	}
	defer out.Close()

	// Write the body to file
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return fmt.Errorf("failed to write binary: %w", err)
	}

	// Make binary executable on Unix systems
	if runtime.GOOS != "windows" {
		if err := os.Chmod(binaryPath, 0755); err != nil {
			return fmt.Errorf("failed to make binary executable: %w", err)
		}
	}

	fmt.Println("✓ Binary downloaded successfully")
	return nil
}

// findBinary looks for the lambda-lift binary in cache
func findBinary() (string, error) {
	// Get cache directory
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}

	binaryDir := filepath.Join(cacheDir, "lambda-lift")
	binaryName := "lambda-lift"
	if runtime.GOOS == "windows" {
		binaryName = "lambda-lift.exe"
	}

	binaryPath := filepath.Join(binaryDir, binaryName)

	// Check if binary exists
	if _, err := os.Stat(binaryPath); os.IsNotExist(err) {
		// Download binary
		if err := downloadBinary(binaryPath); err != nil {
			return "", err
		}
	}

	return binaryPath, nil
}

// tryNpx attempts to run lambda-lift via npx
func tryNpx(args []string) bool {
	npxPath, err := exec.LookPath("npx")
	if err != nil {
		return false
	}

	cmd := exec.Command(npxPath, append([]string{"lambda-lift"}, args...)...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	err = cmd.Run()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		return false
	}

	os.Exit(0)
	return true
}

// runBinary executes the downloaded binary
func runBinary(binaryPath string, args []string) error {
	cmd := exec.Command(binaryPath, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	err := cmd.Run()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		return err
	}

	return nil
}

func main() {
	args := os.Args[1:]

	// Strategy 1: Try using npx if available (preferred)
	if tryNpx(args) {
		return
	}

	// Strategy 2: Use standalone binary
	binaryPath, err := findBinary()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n\n", err)
		fmt.Fprintln(os.Stderr, "To fix this, try one of the following:")
		fmt.Fprintln(os.Stderr, "  1. Install Node.js and run: npm install -g lambda-lift")
		fmt.Fprintf(os.Stderr, "  2. Download the binary manually from: https://github.com/%s/releases\n", repository)
		os.Exit(1)
	}

	if err := runBinary(binaryPath, args); err != nil {
		fmt.Fprintf(os.Stderr, "Error running lambda-lift: %v\n", err)
		os.Exit(1)
	}
}

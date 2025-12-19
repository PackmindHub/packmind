# Packmind CLI Installer for Windows
# Usage: irm https://raw.githubusercontent.com/PackmindHub/packmind/main/apps/cli/scripts/install.ps1 | iex
#
# Parameters:
#   -LoginCode      - Auto-login with invitation code after install (or use $env:PACKMIND_LOGIN_CODE)
#   -ServerHost     - Packmind server URL (or use $env:PACKMIND_HOST, default: https://app.packmind.ai)
#   -Version        - Install a specific version (or use $env:PACKMIND_VERSION, default: latest)
#   -InstallDir     - Custom install directory (or use $env:PACKMIND_INSTALL_DIR, default: $env:USERPROFILE\.packmind\bin)

param(
    [string]$LoginCode,
    [string]$ServerHost,
    [string]$Version,
    [string]$InstallDir
)

# Error handling
$ErrorActionPreference = "Stop"

# Configuration
$REPO = "PackmindHub/packmind"
$BINARY_NAME = "packmind-cli"
$DEFAULT_INSTALL_DIR = "$env:USERPROFILE\.packmind\bin"
$DEFAULT_HOST = "https://app.packmind.ai"

# Helper functions for colored output
function Write-Info {
    param([string]$Message)
    Write-Host "info: $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "success: $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "warn: $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "error: $Message" -ForegroundColor Red
}

function Abort {
    param([string]$Message)
    Write-Error $Message
    exit 1
}

# Check for required dependencies
function Test-Dependencies {
    if (-not (Get-Command Invoke-WebRequest -ErrorAction SilentlyContinue)) {
        Abort "Invoke-WebRequest is required to download the CLI"
    }
}

# Detect the current platform
# Sets: $script:PLATFORM (e.g., windows-x64)
# Note: Only x64 architecture is currently supported on Windows
function Get-Platform {
    $os = "windows"
    
    # Check architecture - prioritize PROCESSOR_ARCHITEW6432 (set on 64-bit systems)
    # then fall back to PROCESSOR_ARCHITECTURE
    $arch = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }

    # Handle AMD64 (64-bit x86) - this is the only supported architecture
    if ($arch -eq "AMD64") {
        $arch_name = "x64"
    } else {
        Abort "Unsupported architecture: $arch. Only x64 (AMD64) is supported on Windows."
    }

    $script:PLATFORM = "${os}-${arch_name}"
    Write-Info "Detected platform: $script:PLATFORM"
}

# Get the version to install
# Sets: $script:VERSION
function Get-Version {
    # Check parameter first, then environment variable
    if ($Version) {
        $script:VERSION = $Version
        Write-Info "Using specified version: $script:VERSION"
        return
    }

    if ($env:PACKMIND_VERSION) {
        $script:VERSION = $env:PACKMIND_VERSION
        Write-Info "Using environment variable version: $script:VERSION"
        return
    }

    Write-Info "Fetching latest version..."

    try {
        $releasesUrl = "https://api.github.com/repos/$REPO/releases?per_page=20"
        $releases = Invoke-WebRequest -Uri $releasesUrl -UseBasicParsing | ConvertFrom-Json

        # Find the latest release-cli/* tag
        $latestCliRelease = $releases | Where-Object { $_.tag_name -like "release-cli/*" } | Select-Object -First 1

        if (-not $latestCliRelease) {
            Abort "Could not determine latest version. Please specify -Version parameter or PACKMIND_VERSION environment variable."
        }

        $script:VERSION = $latestCliRelease.tag_name -replace "release-cli/", ""
        Write-Info "Latest version: $script:VERSION"
    } catch {
        Abort "Failed to fetch latest version: $_"
    }
}

# Download the binary
# Sets: $script:TEMP_DIR, $script:BINARY_PATH
function Get-Binary {
    $script:TEMP_DIR = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
    
    $filename = "${BINARY_NAME}-${script:PLATFORM}-${script:VERSION}.exe"
    $downloadUrl = "https://github.com/${REPO}/releases/download/release-cli/${script:VERSION}/${filename}"
    $script:BINARY_PATH = Join-Path $script:TEMP_DIR $filename

    Write-Info "Downloading from: $downloadUrl"

    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $script:BINARY_PATH -UseBasicParsing
    } catch {
        Abort "Failed to download binary. Check if version $($script:VERSION) exists for platform $($script:PLATFORM). Error: $_"
    }

    # Verify the download
    if (-not (Test-Path $script:BINARY_PATH)) {
        Abort "Download failed: file not found"
    }

    # Check file size (should be > 1MB for a valid binary)
    $fileInfo = Get-Item $script:BINARY_PATH
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 1)
    
    if ($fileInfo.Length -lt 1000000) {
        Abort "Downloaded file is too small ($($fileInfo.Length) bytes). The download may have failed."
    }

    Write-Success "Downloaded successfully ($sizeMB MB)"
}

# Install the binary to the target directory
function Install-Binary {
    # Check parameter first, then environment variable, then default
    if ($InstallDir) {
        $targetDir = $InstallDir
    } elseif ($env:PACKMIND_INSTALL_DIR) {
        $targetDir = $env:PACKMIND_INSTALL_DIR
    } else {
        $targetDir = $DEFAULT_INSTALL_DIR
    }

    # Create install directory if it doesn't exist
    if (-not (Test-Path $targetDir)) {
        Write-Info "Creating install directory: $targetDir"
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    $targetName = "${BINARY_NAME}.exe"
    $targetPath = Join-Path $targetDir $targetName

    # Check if already installed
    if (Test-Path $targetPath) {
        Write-Info "Replacing existing installation at $targetPath"
    }

    # Copy binary to install directory
    Copy-Item -Path $script:BINARY_PATH -Destination $targetPath -Force

    Write-Success "Installed to: $targetPath"
    
    # Store for later use
    $script:INSTALL_DIR = $targetDir
    $script:CLI_PATH = $targetPath
}

# Configure PATH in user environment
function Set-Path {
    $installDir = $script:INSTALL_DIR

    # Check if install dir is already in PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -like "*$installDir*") {
        Write-Info "The install directory is already in your PATH"
        return
    }

    # Add to user PATH via registry
    Write-Info "Adding install directory to user PATH..."
    
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath) {
        $newPath = "$userPath;$installDir"
    } else {
        $newPath = $installDir
    }

    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    
    # Update current session PATH
    $env:Path = "$env:Path;$installDir"

    Write-Success "PATH configured. You may need to restart your terminal for changes to take effect."
}

# Auto-login if credentials provided
# Sets: $script:LOGIN_SUCCESS
function Invoke-AutoLogin {
    $script:LOGIN_SUCCESS = $false

    # Check parameter first, then environment variable
    $loginCode = if ($LoginCode -and $LoginCode.Trim()) { $LoginCode.Trim() } elseif ($env:PACKMIND_LOGIN_CODE -and $env:PACKMIND_LOGIN_CODE.Trim()) { $env:PACKMIND_LOGIN_CODE.Trim() } else { $null }
    
    if (-not $loginCode) {
        return
    }

    # Check parameter first, then environment variable, then default
    # Validate that ServerHost is not empty or whitespace
    $hostUrl = $null
    if ($ServerHost -and $ServerHost.Trim()) {
        $hostUrl = $ServerHost.Trim()
    } elseif ($env:PACKMIND_HOST -and $env:PACKMIND_HOST.Trim()) {
        $hostUrl = $env:PACKMIND_HOST.Trim()
    } else {
        $hostUrl = $DEFAULT_HOST
    }

    # Validate URI format
    try {
        $uri = [System.Uri]$hostUrl
        if (-not $uri.IsAbsoluteUri) {
            Abort "Invalid Host URL: '$hostUrl'. Must be a valid absolute URI (e.g., https://app.packmind.ai)"
        }
    } catch {
        Abort "Invalid Host URL: '$hostUrl'. Error: $_"
    }

    Write-Info "Logging in with provided code..."

    try {
        $process = Start-Process -FilePath $script:CLI_PATH -ArgumentList "login", "--code", $loginCode, "--host", $hostUrl -Wait -NoNewWindow -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Success "Login successful!"
            $script:LOGIN_SUCCESS = $true
        } else {
            Write-Warn "Login failed. You can try again later with: $BINARY_NAME login"
        }
    } catch {
        Write-Warn "Login failed: $_ You can try again later with: $BINARY_NAME login"
    }
}

# Setup MCP after successful login
function Invoke-SetupMCP {
    if (-not $script:LOGIN_SUCCESS) {
        return
    }

    Write-Host ""
    Write-Info "Configuring MCP for AI agents..."

    try {
        $process = Start-Process -FilePath $script:CLI_PATH -ArgumentList "setup-mcp" -Wait -NoNewWindow -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Success "MCP configured!"
        } else {
            Write-Warn "MCP setup failed. You can try again later with: $BINARY_NAME setup-mcp"
        }
    } catch {
        Write-Warn "MCP setup failed: $_ You can try again later with: $BINARY_NAME setup-mcp"
    }
}

# Print post-install instructions
function Write-Instructions {
    Write-Host ""
    Write-Success "Packmind CLI installed successfully!"
    Write-Host ""

    # Configure PATH automatically
    Set-Path

    Write-Host ""
    Write-Host "You can now run:"
    Write-Host "  $BINARY_NAME --help"

    # Login instructions if not already logged in
    if (-not $LoginCode -and -not $env:PACKMIND_LOGIN_CODE) {
        Write-Host ""
        Write-Info "To authenticate with Packmind, run:"
        Write-Host "  $BINARY_NAME login"
    }
}

# Main function
function Main {
    Write-Host ""
    Write-Info "Packmind CLI Installer"
    Write-Host ""

    Test-Dependencies
    Get-Platform
    Get-Version
    Get-Binary
    Install-Binary
    Write-Instructions
    Invoke-AutoLogin
    Invoke-SetupMCP

    # Cleanup temp directory
    if ($script:TEMP_DIR -and (Test-Path $script:TEMP_DIR)) {
        Remove-Item -Path $script:TEMP_DIR -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Run main function
Main


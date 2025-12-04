#!/bin/sh
# Packmind CLI Installer
# Usage: curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/PackmindHub/packmind/main/apps/cli/scripts/install.sh | sh
#
# Environment variables:
#   PACKMIND_VERSION     - Install a specific version (default: latest)
#   PACKMIND_INSTALL_DIR - Custom install directory (default: $HOME/.packmind/bin)
#   PACKMIND_LOGIN_CODE  - Auto-login with invitation code after install
#   PACKMIND_HOST        - Packmind server URL (default: https://app.packmind.ai)

set -eu

# Configuration
REPO="PackmindHub/packmind"
BINARY_NAME="packmind-cli"
DEFAULT_INSTALL_DIR="$HOME/.packmind/bin"
DEFAULT_HOST="https://app.packmind.ai"

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

info() {
    printf "${BLUE}info:${NC} %s\n" "$1"
}

success() {
    printf "${GREEN}success:${NC} %s\n" "$1"
}

warn() {
    printf "${YELLOW}warn:${NC} %s\n" "$1"
}

error() {
    printf "${RED}error:${NC} %s\n" "$1" >&2
}

abort() {
    error "$1"
    exit 1
}

# Check for required dependencies
check_dependencies() {
    if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
        abort "Either curl or wget is required to download the CLI"
    fi
}

# Download a URL to a file (with progress bar if terminal)
# Usage: download URL DESTINATION
download() {
    url="$1"
    dest="$2"

    if command -v curl >/dev/null 2>&1; then
        if [ -t 1 ]; then
            # Terminal: show progress bar
            curl --proto '=https' --tlsv1.2 -fL --progress-bar "$url" -o "$dest"
        else
            # Not a terminal: silent mode
            curl --proto '=https' --tlsv1.2 -sSfL "$url" -o "$dest"
        fi
    elif command -v wget >/dev/null 2>&1; then
        if [ -t 1 ]; then
            # Terminal: show progress bar
            wget --https-only --show-progress -q "$url" -O "$dest"
        else
            # Not a terminal: silent mode
            wget --https-only -q "$url" -O "$dest"
        fi
    else
        abort "No download tool available"
    fi
}

# Fetch content from URL and output to stdout
# Usage: fetch URL
fetch() {
    url="$1"

    if command -v curl >/dev/null 2>&1; then
        curl --proto '=https' --tlsv1.2 -sSfL "$url"
    elif command -v wget >/dev/null 2>&1; then
        wget --https-only -qO- "$url"
    else
        abort "No download tool available"
    fi
}

# Detect the current platform
# Sets: PLATFORM (e.g., linux-x64, macos-arm64)
detect_platform() {
    os=$(uname -s)
    arch=$(uname -m)

    case "$os" in
        Linux)
            os_name="linux"
            ;;
        Darwin)
            os_name="macos"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            os_name="windows"
            ;;
        *)
            abort "Unsupported operating system: $os"
            ;;
    esac

    case "$arch" in
        x86_64|amd64)
            if [ "$os_name" = "macos" ]; then
                arch_name="x64-baseline"
            else
                arch_name="x64"
            fi
            ;;
        aarch64|arm64)
            arch_name="arm64"
            ;;
        *)
            abort "Unsupported architecture: $arch"
            ;;
    esac

    PLATFORM="${os_name}-${arch_name}"
    info "Detected platform: $PLATFORM"
}

# Get the version to install
# Sets: VERSION
get_version() {
    if [ -n "${PACKMIND_VERSION:-}" ]; then
        VERSION="$PACKMIND_VERSION"
        info "Using specified version: $VERSION"
        return
    fi

    info "Fetching latest version..."

    # Fetch releases and find the latest CLI release
    releases_url="https://api.github.com/repos/${REPO}/releases?per_page=20"
    releases=$(fetch "$releases_url")

    # Parse for the latest release-cli/* tag
    # Look for "tag_name": "release-cli/X.Y.Z"
    VERSION=$(echo "$releases" | grep -o '"tag_name": *"release-cli/[^"]*"' | head -1 | sed 's/.*release-cli\/\([^"]*\)".*/\1/')

    if [ -z "$VERSION" ]; then
        abort "Could not determine latest version. Please specify PACKMIND_VERSION environment variable."
    fi

    info "Latest version: $VERSION"
}

# Download the binary
# Sets: TEMP_DIR, BINARY_PATH
download_binary() {
    TEMP_DIR=$(mktemp -d)
    trap 'rm -rf "$TEMP_DIR"' EXIT

    # Construct filename based on platform
    case "$PLATFORM" in
        windows-*)
            filename="${BINARY_NAME}-${PLATFORM}-${VERSION}.exe"
            ;;
        *)
            filename="${BINARY_NAME}-${PLATFORM}-${VERSION}"
            ;;
    esac

    download_url="https://github.com/${REPO}/releases/download/release-cli/${VERSION}/${filename}"
    BINARY_PATH="${TEMP_DIR}/${filename}"

    info "Downloading from: $download_url"
    download "$download_url" "$BINARY_PATH" || abort "Failed to download binary. Check if version $VERSION exists for platform $PLATFORM."

    # Verify the download
    if [ ! -f "$BINARY_PATH" ]; then
        abort "Download failed: file not found"
    fi

    # Check file size (should be > 1MB for a valid binary)
    size=$(wc -c < "$BINARY_PATH" | tr -d ' ')
    if [ "$size" -lt 1000000 ]; then
        abort "Downloaded file is too small ($size bytes). The download may have failed."
    fi

    success "Downloaded successfully ($(echo "$size" | awk '{printf "%.1f", $1/1048576}') MB)"
}

# Install the binary to the target directory
install_binary() {
    INSTALL_DIR="${PACKMIND_INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"

    # Create install directory if it doesn't exist
    if [ ! -d "$INSTALL_DIR" ]; then
        info "Creating install directory: $INSTALL_DIR"
        mkdir -p "$INSTALL_DIR"
    fi

    # Determine target filename
    case "$PLATFORM" in
        windows-*)
            target_name="${BINARY_NAME}.exe"
            ;;
        *)
            target_name="$BINARY_NAME"
            ;;
    esac

    target_path="${INSTALL_DIR}/${target_name}"

    # Check if already installed
    if [ -f "$target_path" ]; then
        info "Replacing existing installation at $target_path"
    fi

    # Move binary to install directory
    mv "$BINARY_PATH" "$target_path"

    # Make executable (not needed on Windows)
    case "$PLATFORM" in
        windows-*)
            ;;
        *)
            chmod +x "$target_path"
            ;;
    esac

    success "Installed to: $target_path"
}

# Auto-login if credentials provided
auto_login() {
    if [ -z "${PACKMIND_LOGIN_CODE:-}" ]; then
        return
    fi

    HOST="${PACKMIND_HOST:-$DEFAULT_HOST}"
    INSTALL_DIR="${PACKMIND_INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"

    case "$PLATFORM" in
        windows-*)
            cli_path="${INSTALL_DIR}/${BINARY_NAME}.exe"
            ;;
        *)
            cli_path="${INSTALL_DIR}/${BINARY_NAME}"
            ;;
    esac

    info "Logging in with provided code..."

    if "$cli_path" login --code "$PACKMIND_LOGIN_CODE" --host "$HOST"; then
        success "Login successful!"
    else
        warn "Login failed. You can try again later with: $BINARY_NAME login"
    fi
}

# Configure PATH in shell rc file
configure_path() {
    INSTALL_DIR="${PACKMIND_INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"
    export_line="export PATH=\"$INSTALL_DIR:\$PATH\""

    # Check if install dir is already in PATH
    case ":$PATH:" in
        *":$INSTALL_DIR:"*)
            info "The install directory is already in your PATH"
            return 0
            ;;
    esac

    # Detect shell and find appropriate config file
    # Note: On Windows Git Bash, we use .bashrc because Git Bash runs as
    # a non-login shell and only sources .bashrc, not .bash_profile
    shell_name=$(basename "${SHELL:-/bin/sh}")
    case "$shell_name" in
        bash)
            # Always use .bashrc for bash (works on Linux, macOS, and Git Bash on Windows)
            rc_file="$HOME/.bashrc"
            ;;
        zsh)
            rc_file="$HOME/.zshrc"
            ;;
        *)
            warn "Unknown shell: $shell_name. Please add this to your shell configuration manually:"
            echo "  $export_line"
            return 0
            ;;
    esac

    # Check if the export line is already in the rc file
    if [ -f "$rc_file" ] && grep -q "$INSTALL_DIR" "$rc_file" 2>/dev/null; then
        info "PATH already configured in $rc_file"
    else
        # Add the export line to the rc file (creates the file if it doesn't exist)
        info "Adding PATH to $rc_file"
        echo "" >> "$rc_file"
        echo "# Packmind CLI" >> "$rc_file"
        echo "$export_line" >> "$rc_file"
        success "PATH configured in $rc_file"
    fi

    # Source the rc file to update current session
    info "Updating current shell session..."
    export PATH="$INSTALL_DIR:$PATH"
}

# Print post-install instructions
print_instructions() {
    INSTALL_DIR="${PACKMIND_INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"

    echo ""
    success "Packmind CLI installed successfully!"
    echo ""

    # Configure PATH automatically
    configure_path

    echo ""
    echo "You can now run:"
    echo "  ${BINARY_NAME} --help"

    # Login instructions if not already logged in
    if [ -z "${PACKMIND_LOGIN_CODE:-}" ]; then
        echo ""
        info "To authenticate with Packmind, run:"
        echo "  ${BINARY_NAME} login"
    fi
}

main() {
    echo ""
    info "Packmind CLI Installer"
    echo ""

    check_dependencies
    detect_platform
    get_version
    download_binary
    install_binary
    print_instructions
    auto_login
}

# Wrap everything in main() to prevent partial execution when piping
main "$@"

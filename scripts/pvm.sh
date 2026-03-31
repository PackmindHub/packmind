#!/bin/sh
# pvm - Packmind Version Manager
# A dev tool to manage multiple packmind-cli versions locally.
#
# Usage: source this file in your shell, then use the `pvm` function.
#   source scripts/pvm.sh
#   pvm ls              # list available versions from GitHub releases
#   pvm use <version>   # switch to a version (downloads if not installed locally)
#
# Inspired by nvm. Must be sourced (not executed) so it can modify $PATH.

PVM_DIR="${PVM_DIR:-$HOME/.pvm}"
PVM_REPO="PackmindHub/packmind"
PVM_BINARY_NAME="packmind-cli"

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
    _PVM_RED='\033[0;31m'
    _PVM_GREEN='\033[0;32m'
    _PVM_YELLOW='\033[0;33m'
    _PVM_BLUE='\033[0;34m'
    _PVM_BOLD='\033[1m'
    _PVM_DIM='\033[2m'
    _PVM_NC='\033[0m'
else
    _PVM_RED=''
    _PVM_GREEN=''
    _PVM_YELLOW=''
    _PVM_BLUE=''
    _PVM_BOLD=''
    _PVM_DIM=''
    _PVM_NC=''
fi

_pvm_info() {
    printf "${_PVM_BLUE}pvm:${_PVM_NC} %s\n" "$1"
}

_pvm_success() {
    printf "${_PVM_GREEN}pvm:${_PVM_NC} %s\n" "$1"
}

_pvm_warn() {
    printf "${_PVM_YELLOW}pvm:${_PVM_NC} %s\n" "$1"
}

_pvm_error() {
    printf "${_PVM_RED}pvm:${_PVM_NC} %s\n" "$1" >&2
}

_pvm_detect_platform() {
    os=$(uname -s)
    arch=$(uname -m)

    case "$os" in
        Linux)   os_name="linux" ;;
        Darwin)  os_name="macos" ;;
        MINGW*|MSYS*|CYGWIN*) os_name="windows" ;;
        *)       _pvm_error "Unsupported OS: $os"; return 1 ;;
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
            _pvm_error "Unsupported architecture: $arch"; return 1
            ;;
    esac

    echo "${os_name}-${arch_name}"
}

_pvm_fetch() {
    url="$1"
    if command -v curl >/dev/null 2>&1; then
        curl --proto '=https' --tlsv1.2 -sSfL "$url"
    elif command -v wget >/dev/null 2>&1; then
        wget --https-only -qO- "$url"
    else
        _pvm_error "curl or wget required"
        return 1
    fi
}

_pvm_download() {
    url="$1"
    dest="$2"
    if command -v curl >/dev/null 2>&1; then
        curl --proto '=https' --tlsv1.2 -fL --progress-bar "$url" -o "$dest"
    elif command -v wget >/dev/null 2>&1; then
        wget --https-only --show-progress -q "$url" -O "$dest"
    else
        _pvm_error "curl or wget required"
        return 1
    fi
}

# Strip any existing pvm version path from PATH
_pvm_strip_path() {
    echo "$PATH" | sed "s|${PVM_DIR}/versions/[^:]*:||g" | sed "s|:${PVM_DIR}/versions/[^:]*||g"
}

_pvm_current_version() {
    case ":$PATH:" in
        *":${PVM_DIR}/versions/"*)
            echo "$PATH" | tr ':' '\n' | grep "^${PVM_DIR}/versions/" | head -1 | sed "s|${PVM_DIR}/versions/||" | cut -d'/' -f1
            ;;
        *)
            echo ""
            ;;
    esac
}

# ── pvm ls ──────────────────────────────────────────────────────────────────

_pvm_ls() {
    _pvm_info "Fetching available versions from GitHub..."

    releases=$(_pvm_fetch "https://api.github.com/repos/${PVM_REPO}/releases?per_page=100") || {
        _pvm_error "Failed to fetch releases"
        return 1
    }

    versions=$(echo "$releases" | grep -o '"tag_name": *"release-cli/[^"]*"' | sed 's/.*release-cli\/\([^"]*\)".*/\1/')

    if [ -z "$versions" ]; then
        _pvm_error "No CLI releases found"
        return 1
    fi

    current=$(_pvm_current_version)

    echo ""
    printf "${_PVM_BOLD}  Available packmind-cli versions:${_PVM_NC}\n"
    echo ""

    for v in $versions; do
        installed=""
        active=""

        if [ -d "${PVM_DIR}/versions/${v}" ]; then
            installed="${_PVM_GREEN} (installed)${_PVM_NC}"
        fi

        if [ "$v" = "$current" ]; then
            printf "  ${_PVM_GREEN}-> %-14s${_PVM_NC}%b\n" "$v" "$installed"
        else
            printf "     %-14s%b\n" "$v" "$installed"
        fi
    done
    echo ""
}

# ── pvm use ─────────────────────────────────────────────────────────────────

_pvm_use() {
    version="$1"

    if [ -z "$version" ]; then
        _pvm_error "Usage: pvm use <version>"
        return 1
    fi

    version_dir="${PVM_DIR}/versions/${version}"
    binary_path="${version_dir}/${PVM_BINARY_NAME}"

    # Download if not installed locally
    if [ ! -x "$binary_path" ]; then
        _pvm_info "Version ${version} not found locally, downloading..."

        platform=$(_pvm_detect_platform) || return 1

        case "$platform" in
            windows-*) filename="${PVM_BINARY_NAME}-${platform}-${version}.exe" ;;
            *)         filename="${PVM_BINARY_NAME}-${platform}-${version}" ;;
        esac

        download_url="https://github.com/${PVM_REPO}/releases/download/release-cli/${version}/${filename}"

        mkdir -p "$version_dir"

        _pvm_info "Downloading from: ${download_url}"
        _pvm_download "$download_url" "$binary_path" || {
            rm -rf "$version_dir"
            _pvm_error "Failed to download version ${version}. Does it exist?"
            return 1
        }

        # Verify size (should be > 1MB)
        size=$(wc -c < "$binary_path" | tr -d ' ')
        if [ "$size" -lt 1000000 ]; then
            rm -rf "$version_dir"
            _pvm_error "Downloaded file too small (${size} bytes). Version may not exist for your platform."
            return 1
        fi

        chmod +x "$binary_path"

        # Create symlinks for convenience (packmind -> packmind-cli)
        ln -sf "$PVM_BINARY_NAME" "${version_dir}/packmind" 2>/dev/null

        _pvm_success "Installed version ${version}"
    fi

    # Swap PATH
    stripped_path=$(_pvm_strip_path)
    export PATH="${version_dir}:${stripped_path}"

    # Clear shell hash table so it picks up the new binary location
    \hash -r 2>/dev/null

    _pvm_success "Now using packmind-cli ${version}"
    _pvm_info "$(${binary_path} --version 2>/dev/null || echo "binary at: ${binary_path}")"
}

# ── Main entry point ────────────────────────────────────────────────────────

pvm() {
    case "${1:-}" in
        ls)
            _pvm_ls
            ;;
        use)
            shift
            _pvm_use "${1:-}"
            ;;
        ""|help|-h|--help)
            current=$(_pvm_current_version)
            echo ""
            echo "  ${_PVM_BOLD}pvm - Packmind Version Manager${_PVM_NC}"
            echo "  A dev tool to switch between packmind-cli versions."
            echo ""
            printf "  ${_PVM_BOLD}Setup:${_PVM_NC}\n"
            echo "    source scripts/pvm.sh        Source pvm into your shell (required)"
            echo ""
            echo "    To load pvm automatically, add this to your .zshrc or .bashrc:"
            echo "      export PVM_DIR=\"\$HOME/.pvm\""
            echo "      [ -s \"/path/to/scripts/pvm.sh\" ] && . \"/path/to/scripts/pvm.sh\""
            echo ""
            printf "  ${_PVM_BOLD}Commands:${_PVM_NC}\n"
            echo "    pvm ls              List available versions from GitHub releases"
            echo "    pvm use <version>   Switch to a version (downloads if not installed)"
            echo "    pvm help            Show this help"
            echo ""
            printf "  ${_PVM_BOLD}Examples:${_PVM_NC}\n"
            echo "    pvm ls              # see what's available"
            echo "    pvm use 0.24.0      # switch to 0.24.0 (downloads if needed)"
            echo "    pvm use 0.23.0      # switch back to 0.23.0"
            echo ""
            printf "  ${_PVM_BOLD}Current version:${_PVM_NC} ${current:-none}\n"
            printf "  ${_PVM_BOLD}Versions dir:${_PVM_NC}    ${PVM_DIR}/versions/\n"
            echo ""
            ;;
        *)
            _pvm_error "Unknown command: $1"
            echo "  Run 'pvm help' for usage"
            return 1
            ;;
    esac
}

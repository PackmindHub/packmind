// Docker Bake configuration for Packmind images
// Usage:
//   Build all (single platform): EDITION=oss docker buildx bake --load
//   Build for release (multi-platform): EDITION=oss docker buildx bake release --push
//
// Set EDITION to "oss" or "proprietary" to build the corresponding images.

// ============================================================================
// Variables
// ============================================================================

variable "VERSION" {
  default = "latest"
}

variable "SHA" {
  default = ""
}

variable "REGISTRY" {
  default = "packmind"
}

variable "EDITION" {
  default = "oss"
}

variable "IMAGE_NAME_SUFFIX" {
  // For OSS: empty string (results in packmind/api)
  // For proprietary: empty string (results in packmind/api)
  // For others: -${EDITION} (results in packmind/api-${EDITION})
  default = ""
}

variable "VERSION_SUFFIX" {
  // For OSS: empty string (results in version like 1.4.2)
  // For proprietary: -enterprise (results in version like 1.4.2-enterprise)
  // For others: -${EDITION} (results in version like 1.4.2-${EDITION})
  default = ""
}

// ============================================================================
// Groups
// ============================================================================

group "default" {
  targets = ["api", "frontend", "mcp"]
}

group "release" {
  targets = ["api-release", "frontend-release", "mcp-release"]
}

// ============================================================================
// Shared target configuration
// ============================================================================

target "_common" {
  context = "."
}

target "_platforms-release" {
  platforms = ["linux/amd64", "linux/arm64"]
}

// ============================================================================
// API Target
// ============================================================================

target "api" {
  inherits   = ["_common"]
  dockerfile = "dockerfile/Dockerfile.api"
  args = {
    EDITION = "${EDITION}"
  }
  tags = [
    "${REGISTRY}/api${IMAGE_NAME_SUFFIX}:${VERSION}${VERSION_SUFFIX}",
    "${REGISTRY}/api${IMAGE_NAME_SUFFIX}:latest",
    notequal("", SHA) ? "${REGISTRY}/api${IMAGE_NAME_SUFFIX}:${SHA}" : "",
  ]
  platforms = ["linux/amd64"]
}

target "api-release" {
  inherits = ["api", "_platforms-release"]
}

// ============================================================================
// Frontend Target
// ============================================================================

target "frontend" {
  inherits   = ["_common"]
  dockerfile = "dockerfile/Dockerfile.frontend"
  tags = [
    "${REGISTRY}/frontend${IMAGE_NAME_SUFFIX}:${VERSION}${VERSION_SUFFIX}",
    "${REGISTRY}/frontend${IMAGE_NAME_SUFFIX}:latest",
    notequal("", SHA) ? "${REGISTRY}/frontend${IMAGE_NAME_SUFFIX}:${SHA}" : "",
  ]
  platforms = ["linux/amd64"]
}

target "frontend-release" {
  inherits = ["frontend", "_platforms-release"]
}

// ============================================================================
// MCP Server Target
// ============================================================================

target "mcp" {
  inherits   = ["_common"]
  dockerfile = "dockerfile/Dockerfile.mcp"
  tags = [
    "${REGISTRY}/mcp${IMAGE_NAME_SUFFIX}:${VERSION}${VERSION_SUFFIX}",
    "${REGISTRY}/mcp${IMAGE_NAME_SUFFIX}:latest",
    notequal("", SHA) ? "${REGISTRY}/mcp${IMAGE_NAME_SUFFIX}:${SHA}" : "",
  ]
  platforms = ["linux/amd64"]
}

target "mcp-release" {
  inherits = ["mcp", "_platforms-release"]
}

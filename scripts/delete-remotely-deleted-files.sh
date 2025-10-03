#!/usr/bin/env bash
set -euo pipefail

# This script ensures true mirroring by selectively removing files from the target repository
# that don't exist in the current source repository (after filtering).
# Instead of deleting everything and re-adding, this approach:
# 1. Lists all files currently in the target repository (excluding .git and node_modules)
# 2. Determines which files actually exist in the source repository (after applying whitelist)
# 3. Removes only the files that no longer exist in the actual filtered source
#
# Note: node_modules directories are automatically excluded as they contain generated dependencies.
# This approach requires the PRIVATE_MAIN_SHA environment variable to be set.
#
# Usage:
#   PRIVATE_MAIN_SHA=<commit_sha> ./delete-remotely-deleted-files.sh           # Execute the cleanup
#   PRIVATE_MAIN_SHA=<commit_sha> ./delete-remotely-deleted-files.sh --dry-run # Show what would be deleted

# Parse command line arguments
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--help]"
      echo ""
      echo "Options:"
      echo "  --dry-run    Show what would be deleted without actually deleting anything"
      echo "  --help       Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check required environment variable
if [ -z "${PRIVATE_MAIN_SHA:-}" ]; then
  echo "❌ Error: PRIVATE_MAIN_SHA environment variable is required"
  echo "   This should be set to the commit SHA of the private repository"
  exit 1
fi

if [ "$DRY_RUN" = true ]; then
  echo "🔍 DRY RUN MODE: Showing what would be deleted without actually deleting anything..."
else
  echo "🧹 Starting selective cleanup of files that no longer exist in source..."
fi

echo "📍 Using private repository commit: $PRIVATE_MAIN_SHA"

# Get list of all files currently in the target repository (excluding .git and node_modules)
echo "🔍 Scanning current target repository files..."
current_files_temp=$(mktemp)
find . -type f -not -path './.git/*' -not -path '*/node_modules/*' -print | sed 's|^\./||' | sort > "$current_files_temp"

if [ ! -s "$current_files_temp" ]; then
  echo "📭 No files found in target repository to check"
  rm -f "$current_files_temp"
  exit 0
fi

echo "📋 Found $(wc -l < "$current_files_temp" | tr -d ' ') files in target repository"

# Get list of files that ACTUALLY EXIST in the source repository (after filtering)
echo "🔍 Building list of actual files that should exist in target..."
actual_source_files_temp=$(mktemp)

# Simplified approach: Get all files from source commit and apply whitelist patterns
echo "🔍 Getting files from source commit and applying whitelist..."

# Get all files that exist in the source commit
all_source_files_temp=$(mktemp)
git ls-tree -r --name-only "$PRIVATE_MAIN_SHA" | sort > "$all_source_files_temp" 2>/dev/null || {
  echo "❌ Warning: Could not list files from source commit $PRIVATE_MAIN_SHA"
  touch "$actual_source_files_temp"
  rm -f "$all_source_files_temp"
  exit 0
}

echo "📋 Found $(wc -l < "$all_source_files_temp" | tr -d ' ') total files in source commit"

# Create a temporary directory and recreate the file structure for whitelist processing
if git show "$PRIVATE_MAIN_SHA:.mirror/whitelist.txt" >/dev/null 2>&1; then
  source_work_dir=$(mktemp -d)
  
  # Extract the whitelist
  git show "$PRIVATE_MAIN_SHA:.mirror/whitelist.txt" > "$source_work_dir/whitelist.txt" 2>/dev/null || {
    echo "❌ Could not extract whitelist"
    touch "$actual_source_files_temp"
    rm -rf "$source_work_dir" "$all_source_files_temp" 2>/dev/null || true
    exit 0
  }
  
  # Create the file structure in temp directory
  while IFS= read -r file; do
    if [ -n "$file" ]; then
      full_path="$source_work_dir/$file"
      mkdir -p "$(dirname "$full_path")" 2>/dev/null || true
      touch "$full_path" 2>/dev/null || true
    fi
  done < "$all_source_files_temp"
  
  # Apply whitelist filter
  original_pwd=$(pwd)
  (
    cd "$source_work_dir"
    # Use absolute path to the list-whitelisted-files.sh script
    list_script="$original_pwd/scripts/list-whitelisted-files.sh"
    if [ -f "$list_script" ]; then
      cat "whitelist.txt" | bash "$list_script" - > "$actual_source_files_temp" 2>/dev/null || {
        echo "⚠️  Whitelist processing failed, using all source files"
        cp "$all_source_files_temp" "$actual_source_files_temp"
      }
    else
      echo "⚠️  Could not find list-whitelisted-files.sh script at $list_script, using all source files"
      cp "$all_source_files_temp" "$actual_source_files_temp"
    fi
  )
  
  rm -rf "$source_work_dir" 2>/dev/null || true
else
  echo "❌ Warning: Could not find whitelist at $PRIVATE_MAIN_SHA:.mirror/whitelist.txt"
  # Fallback: use all files from source
  cp "$all_source_files_temp" "$actual_source_files_temp"
fi

rm -f "$all_source_files_temp" 2>/dev/null || true

# Normalize paths (strip leading ./)
sed -i '' 's|^\./||' "$actual_source_files_temp" 2>/dev/null || sed -i 's|^\./||' "$actual_source_files_temp" 2>/dev/null || true
sort "$actual_source_files_temp" -o "$actual_source_files_temp"

echo "📋 Found $(wc -l < "$actual_source_files_temp" | tr -d ' ') files that should exist in target"

# Find files to remove (files in target that are NOT in actual source files)
files_to_remove_temp=$(mktemp)
comm -23 "$current_files_temp" "$actual_source_files_temp" > "$files_to_remove_temp"

files_to_remove_count=$(wc -l < "$files_to_remove_temp" | tr -d ' ')

if [ "$files_to_remove_count" -eq 0 ]; then
  echo "✅ No files need to be removed - target repository is already in sync"
  rm -f "$current_files_temp" "$actual_source_files_temp" "$files_to_remove_temp"
  exit 0
fi

echo ""
echo "🗑️  Files to be removed ($files_to_remove_count files):"
sed 's/^/  - /' "$files_to_remove_temp"

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "🔍 DRY RUN: Would remove $files_to_remove_count files from target repository"
  echo "✅ DRY RUN completed - no files were actually modified"
else
  echo ""
  echo "🗑️  Removing files that no longer exist in source..."
  
  removed_count=0
  # First, remove all files from working directory
  while IFS= read -r file_to_remove; do
    if [ -n "$file_to_remove" ] && [ -f "$file_to_remove" ]; then
      echo "  ❌ Removing: $file_to_remove"
      rm -f "$file_to_remove" 2>/dev/null || true
      removed_count=$((removed_count + 1))
    fi
  done < "$files_to_remove_temp"
  
  # Then remove all files from git index in batch (more efficient)
  echo "🔄 Removing files from git index..."
  xargs -r git rm --cached --ignore-unmatch < "$files_to_remove_temp" 2>/dev/null || true
  
  # Finally, clean up empty directories
  echo "🗂️  Cleaning up empty directories..."
  while IFS= read -r file_to_remove; do
    if [ -n "$file_to_remove" ]; then
      parent_dir=$(dirname "$file_to_remove")
      while [ "$parent_dir" != "." ] && [ -d "$parent_dir" ] && [ -z "$(ls -A "$parent_dir" 2>/dev/null)" ]; do
        rmdir "$parent_dir" 2>/dev/null || break
        parent_dir=$(dirname "$parent_dir")
      done
    fi
  done < "$files_to_remove_temp"
  
  echo ""
  echo "✅ Successfully removed $removed_count files from target repository"
fi

# Clean up temporary files
rm -f "$current_files_temp" "$actual_source_files_temp" "$files_to_remove_temp"

exit 0

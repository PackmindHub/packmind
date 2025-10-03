#!/usr/bin/env bash
set -euo pipefail

# Extracted from .github/workflows/publish-public-repo.yml
# This script applies the whitelist filter from the private repository
# It expects the environment variable PRIVATE_MAIN_SHA to be set (written to GITHUB_ENV in a previous step)

# Default files count
files_count=0

# Use PRIVATE_MAIN_SHA as the private commit reference
PRIVATE_COMMIT="${PRIVATE_MAIN_SHA:-}"
echo "Using private repository SHA: $PRIVATE_COMMIT"

# Ensure GitHub Actions output file is available
if [ -z "${GITHUB_OUTPUT:-}" ]; then
  echo "❌ GITHUB_OUTPUT is not set. Are we running inside GitHub Actions?"
  exit 1
fi

# Export output variable for the workflow using the safe here-doc format
{
  echo "private_commit<<EOF"
  echo "$PRIVATE_COMMIT"
  echo "EOF"
} >> "$GITHUB_OUTPUT"

# Skip cleanup since delete-remotely-deleted-files.sh already handled selective deletion
echo "Current git status before adding files:"
git status || true

# Get list of files that should exist (whitelisted files from the private repository)
echo "🔍 Building whitelist of files to add/update from private repository..."
temp_whitelist_files=$(mktemp)

# Get all files from the private commit
all_files_temp=$(mktemp)
git ls-tree -r --name-only "$PRIVATE_COMMIT" | sort > "$all_files_temp" 2>/dev/null || {
  echo "❌ Could not list files from private commit $PRIVATE_COMMIT"
  exit 1
}

total_files=$(wc -l < "$all_files_temp" | tr -d ' ')
echo "📋 Found $total_files total files in private commit"

# Create a temporary directory to recreate the file structure for whitelist processing
if git show "$PRIVATE_COMMIT:.mirror/whitelist.txt" >/dev/null 2>&1; then
  source_work_dir=$(mktemp -d)
  
  # Extract the whitelist
  git show "$PRIVATE_COMMIT:.mirror/whitelist.txt" > "$source_work_dir/whitelist.txt" 2>/dev/null || {
    echo "❌ Could not extract whitelist"
    rm -rf "$source_work_dir" "$all_files_temp"
    exit 1
  }
  
  # Create the file structure in temp directory (just touch files, no content needed)
  while IFS= read -r file; do
    if [ -n "$file" ]; then
      full_path="$source_work_dir/$file"
      mkdir -p "$(dirname "$full_path")" 2>/dev/null || true
      touch "$full_path" 2>/dev/null || true
    fi
  done < "$all_files_temp"
  
  # Apply whitelist filter
  original_pwd=$(pwd)
  (
    cd "$source_work_dir"
    # Use absolute path to the list-whitelisted-files.sh script
    list_script="$original_pwd/scripts/list-whitelisted-files.sh"
    if [ -f "$list_script" ]; then
      cat "whitelist.txt" | bash "$list_script" - > "$temp_whitelist_files" 2>/dev/null || {
        echo "⚠️  Whitelist processing failed, using all files"
        cp "$all_files_temp" "$temp_whitelist_files"
      }
    else
      echo "⚠️  Could not find list-whitelisted-files.sh script at $list_script, using all files"
      cp "$all_files_temp" "$temp_whitelist_files"
    fi
  )
  
  rm -rf "$source_work_dir" "$all_files_temp" 2>/dev/null || true
else
  echo "❌ Could not find whitelist at $PRIVATE_COMMIT:.mirror/whitelist.txt"
  rm -f "$all_files_temp"
  exit 1
fi

whitelist_files_count=$(wc -l < "$temp_whitelist_files" | tr -d ' ')
echo "📋 Found $whitelist_files_count files matching whitelist patterns"

# Add/update only the whitelisted files from private repository
echo "🔄 Adding/updating whitelisted files from private repository..."
while IFS= read -r file; do
  if [ -n "$file" ]; then
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "$file")" 2>/dev/null || true
    # Extract file from private commit and add to working directory
    if git show "$PRIVATE_COMMIT:$file" > "$file" 2>/dev/null; then
      git add "$file" 2>/dev/null || true
    fi
  fi
done < "$temp_whitelist_files"

rm -f "$temp_whitelist_files"

# Show what was added/updated
all_files=$(git diff --cached --name-only || true)
files_count=$(echo "$all_files" | grep -c . || echo "0")
echo "📁 Added/updated whitelisted files ($files_count files total)"

echo "📋 All staged files:"
git diff --cached --name-only | sed 's/^/  - /' || true

# Write files_count using the safe here-doc format to avoid invalid lines in GITHUB_OUTPUT
{
  echo "files_count<<EOF"
  echo "$files_count"
  echo "EOF"
} >> "$GITHUB_OUTPUT"
echo "🎯 Final files count: $files_count"

exit 0

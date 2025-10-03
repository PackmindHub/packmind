#!/usr/bin/env bash
set -euo pipefail

# Function to handle file replacement: remove target, rename source to target, and git add
replace_file() {
    local source_file="$1"
    local target_file="$2"
    
    echo "Processing: $source_file -> $target_file"
    
    # Remove target file if it exists
    if [ -f "$target_file" ]; then
        echo "  Removing existing $target_file"
        rm "$target_file"
    fi
    
    # Move source to target if source exists
    if [ -f "$source_file" ]; then
        echo "  Moving $source_file to $target_file"
        mv "$source_file" "$target_file"
        git add "$target_file"
    else
        echo "  ❌ Error: Source file $source_file does not exist"
        exit 1
    fi
}

# List of file pairs: source_file:target_file
file_pairs=(
    "README.oss.md:README.md"
    ".github/workflows/main-oss.yml.oss:.github/workflows/main-oss.yml"
)

# Process each file pair
for pair in "${file_pairs[@]}"; do
    IFS=':' read -r source_file target_file <<< "$pair"
    replace_file "$source_file" "$target_file"
done
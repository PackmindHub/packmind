#!/usr/bin/env python3
"""
Playbook Initializer - Creates a new playbook template for coding standards

Usage:
    init_playbook.py <standard-name> --path <path>

Examples:
    init_playbook.py typescript-conventions --path .
    init_playbook.py react-patterns --path ./standards
    init_playbook.py api-guidelines --path /custom/location
"""

import sys
import json
from pathlib import Path


PLAYBOOK_TEMPLATE = {
    "name": "[TODO: Standard Name]",
    "description": "[TODO: A clear description of what this standard covers, why it exists, and what problems it solves.]",
    "scope": "[TODO: Where this standard applies (e.g., 'TypeScript files', 'React components', '*.spec.ts test files')]",
    "rules": [
        {
            "content": "[TODO: First rule starting with action verb (e.g., 'Use', 'Avoid', 'Prefer')]"
        },
        {
            "content": "[TODO: Second rule with examples]",
            "examples": {
                "positive": "[TODO: Code that correctly follows the rule]",
                "negative": "[TODO: Code that violates the rule]",
                "language": "TYPESCRIPT"
            }
        }
    ]
}


def title_case_name(name):
    """Convert hyphenated name to Title Case for display."""
    return ' '.join(word.capitalize() for word in name.split('-'))


def init_playbook(standard_name, path):
    """
    Initialize a new playbook JSON file from template.

    Args:
        standard_name: Name of the standard (used for filename)
        path: Path where the playbook file should be created

    Returns:
        Path to created playbook file, or None if error
    """
    output_path = Path(path).resolve()

    # Ensure output directory exists
    if not output_path.exists():
        try:
            output_path.mkdir(parents=True, exist_ok=True)
            print(f"✅ Created directory: {output_path}")
        except Exception as e:
            print(f"❌ Error creating directory: {e}")
            return None

    # Create playbook filename
    filename = f"{standard_name}.playbook.json"
    playbook_path = output_path / filename

    # Check if file already exists
    if playbook_path.exists():
        print(f"❌ Error: Playbook file already exists: {playbook_path}")
        return None

    # Create playbook from template
    playbook = PLAYBOOK_TEMPLATE.copy()
    playbook["name"] = title_case_name(standard_name)

    try:
        with open(playbook_path, 'w', encoding='utf-8') as f:
            json.dump(playbook, f, indent=2, ensure_ascii=False)
        print(f"✅ Created playbook: {playbook_path}")
    except Exception as e:
        print(f"❌ Error creating playbook: {e}")
        return None

    # Print next steps
    print(f"\n✅ Playbook '{standard_name}' initialized successfully")
    print("\nNext steps:")
    print("1. Edit the playbook to replace all [TODO:...] placeholders")
    print("2. Add more rules as needed (each rule should start with an action verb)")
    print("3. Add examples to rules where helpful (positive, negative, language)")
    print("4. Run the validator to check the playbook format:")
    print(f"   python3 scripts/validate_playbook.py {playbook_path}")
    print("5. Create the standard via CLI:")
    print(f"   packmind-cli standard create {playbook_path}")

    return playbook_path


def main():
    if len(sys.argv) < 4 or sys.argv[2] != '--path':
        print("Usage: init_playbook.py <standard-name> --path <path>")
        print("\nStandard name requirements:")
        print("  - Hyphen-case identifier (e.g., 'typescript-conventions')")
        print("  - Will be converted to Title Case for the standard name")
        print("\nExamples:")
        print("  init_playbook.py typescript-conventions --path .")
        print("  init_playbook.py react-patterns --path ./standards")
        print("  init_playbook.py api-guidelines --path /custom/location")
        sys.exit(1)

    standard_name = sys.argv[1]
    path = sys.argv[3]

    print(f"🚀 Initializing playbook: {standard_name}")
    print(f"   Location: {path}")
    print()

    result = init_playbook(standard_name, path)

    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Playbook Validator - Validates playbook JSON format for coding standards

Usage:
    validate_playbook.py <playbook.json>

Examples:
    validate_playbook.py typescript-conventions.playbook.json
    validate_playbook.py ./standards/react-patterns.playbook.json
"""

import sys
import json
import re
from pathlib import Path


VALID_LANGUAGES = ["AVRO","JAVASCRIPT","JAVASCRIPT_JSX","TYPESCRIPT","TYPESCRIPT_TSX","PYTHON","PHP","JAVA","SCSS","HTML","CSHARP","GENERIC","GO","C","CPP","SQL","KOTLIN","VUE","CSS","YAML","JSON","XML","BASH","MARKDOWN","RUBY","RUST","SAP_ABAP","SAP_CDS","SAP_HANA_SQL","SWIFT","PROPERTIES"]

# Action verbs that rules should start with
ACTION_VERBS = [
    'use', 'avoid', 'prefer', 'include', 'exclude', 'apply', 'implement',
    'follow', 'ensure', 'define', 'declare', 'create', 'add', 'remove',
    'replace', 'convert', 'validate', 'check', 'verify', 'test', 'handle',
    'catch', 'throw', 'return', 'call', 'invoke', 'import', 'export',
    'extend', 'inherit', 'override', 'implement', 'abstract', 'wrap',
    'extract', 'refactor', 'rename', 'move', 'copy', 'delete', 'update',
    'keep', 'maintain', 'organize', 'structure', 'format', 'indent',
    'align', 'space', 'name', 'prefix', 'suffix', 'capitalize', 'lowercase',
    'separate', 'combine', 'merge', 'split', 'group', 'nest', 'flatten',
    'limit', 'restrict', 'allow', 'enable', 'disable', 'require', 'enforce',
    'set', 'configure', 'initialize', 'setup', 'register', 'inject', 'provide',
    'specify', 'annotate', 'document', 'comment', 'log', 'debug', 'trace',
    'write', 'read', 'parse', 'serialize', 'deserialize', 'encode', 'decode',
    'encrypt', 'decrypt', 'hash', 'sign', 'authenticate', 'authorize',
    'sanitize', 'escape', 'quote', 'unquote', 'trim', 'strip', 'pad',
    'always', 'never', 'only', 'do', 'don\'t', 'must', 'should', 'shall',
]


def validate_playbook(playbook_path):
    """
    Validate a playbook JSON file.

    Args:
        playbook_path: Path to the playbook JSON file

    Returns:
        Tuple of (is_valid, list of error messages)
    """
    playbook_path = Path(playbook_path)
    errors = []
    warnings = []

    # Check file exists
    if not playbook_path.exists():
        return False, [f"File not found: {playbook_path}"]

    # Check file extension
    if not playbook_path.suffix == '.json':
        warnings.append(f"Warning: File extension is '{playbook_path.suffix}', expected '.json'")

    # Read and parse JSON
    try:
        with open(playbook_path, 'r', encoding='utf-8') as f:
            playbook = json.load(f)
    except json.JSONDecodeError as e:
        return False, [f"Invalid JSON: {e}"]
    except Exception as e:
        return False, [f"Error reading file: {e}"]

    # Validate required fields
    if not isinstance(playbook, dict):
        return False, ["Playbook must be a JSON object"]

    # Check 'name' field
    if 'name' not in playbook:
        errors.append("Missing required field: 'name'")
    elif not isinstance(playbook['name'], str) or not playbook['name'].strip():
        errors.append("'name' must be a non-empty string")
    elif playbook['name'].startswith('[TODO:'):
        errors.append("'name' still contains TODO placeholder")

    # Check 'description' field
    if 'description' not in playbook:
        errors.append("Missing required field: 'description'")
    elif not isinstance(playbook['description'], str) or not playbook['description'].strip():
        errors.append("'description' must be a non-empty string")
    elif playbook['description'].startswith('[TODO:'):
        errors.append("'description' still contains TODO placeholder")

    # Check 'scope' field
    if 'scope' not in playbook:
        errors.append("Missing required field: 'scope'")
    elif not isinstance(playbook['scope'], str) or not playbook['scope'].strip():
        errors.append("'scope' must be a non-empty string")
    elif playbook['scope'].startswith('[TODO:'):
        errors.append("'scope' still contains TODO placeholder")

    # Check 'rules' field
    if 'rules' not in playbook:
        errors.append("Missing required field: 'rules'")
    elif not isinstance(playbook['rules'], list):
        errors.append("'rules' must be an array")
    elif len(playbook['rules']) == 0:
        errors.append("'rules' must contain at least one rule")
    else:
        # Validate each rule
        for i, rule in enumerate(playbook['rules']):
            rule_prefix = f"rules[{i}]"

            if not isinstance(rule, dict):
                errors.append(f"{rule_prefix}: must be an object")
                continue

            # Check 'content' field
            if 'content' not in rule:
                errors.append(f"{rule_prefix}: missing required field 'content'")
            elif not isinstance(rule['content'], str) or not rule['content'].strip():
                errors.append(f"{rule_prefix}: 'content' must be a non-empty string")
            elif rule['content'].startswith('[TODO:'):
                errors.append(f"{rule_prefix}: 'content' still contains TODO placeholder")
            else:
                # Check if rule starts with action verb
                first_word = rule['content'].split()[0].lower().rstrip(':,')
                if first_word not in ACTION_VERBS:
                    warnings.append(f"{rule_prefix}: 'content' should start with an action verb (e.g., 'Use', 'Avoid', 'Prefer'). Found: '{first_word}'")

            # Validate examples if present
            if 'examples' in rule:
                examples = rule['examples']
                example_prefix = f"{rule_prefix}.examples"

                if not isinstance(examples, dict):
                    errors.append(f"{example_prefix}: must be an object")
                else:
                    # Check required example fields
                    if 'positive' not in examples:
                        errors.append(f"{example_prefix}: missing required field 'positive'")
                    elif not isinstance(examples['positive'], str):
                        errors.append(f"{example_prefix}: 'positive' must be a string")
                    elif examples['positive'].startswith('[TODO:'):
                        errors.append(f"{example_prefix}: 'positive' still contains TODO placeholder")

                    if 'negative' not in examples:
                        errors.append(f"{example_prefix}: missing required field 'negative'")
                    elif not isinstance(examples['negative'], str):
                        errors.append(f"{example_prefix}: 'negative' must be a string")
                    elif examples['negative'].startswith('[TODO:'):
                        errors.append(f"{example_prefix}: 'negative' still contains TODO placeholder")

                    if 'language' not in examples:
                        errors.append(f"{example_prefix}: missing required field 'language'")
                    elif not isinstance(examples['language'], str):
                        errors.append(f"{example_prefix}: 'language' must be a string")
                    elif examples['language'] not in VALID_LANGUAGES:
                        errors.append(f"{example_prefix}: 'language' must be one of: {', '.join(VALID_LANGUAGES[:10])}... (see full list in validator)")

    return len(errors) == 0, errors, warnings


def main():
    if len(sys.argv) != 2:
        print("Usage: validate_playbook.py <playbook.json>")
        print("\nExamples:")
        print("  validate_playbook.py typescript-conventions.playbook.json")
        print("  validate_playbook.py ./standards/react-patterns.playbook.json")
        sys.exit(1)

    playbook_path = sys.argv[1]
    print(f"🔍 Validating playbook: {playbook_path}")
    print()

    result = validate_playbook(playbook_path)

    if len(result) == 3:
        is_valid, errors, warnings = result
    else:
        is_valid, errors = result
        warnings = []

    # Print warnings
    if warnings:
        print("⚠️  Warnings:")
        for warning in warnings:
            print(f"   {warning}")
        print()

    # Print errors
    if errors:
        print("❌ Validation errors:")
        for error in errors:
            print(f"   {error}")
        print()
        print("❌ Playbook validation failed")
        sys.exit(1)
    else:
        print("✅ Playbook is valid!")
        sys.exit(0)


if __name__ == "__main__":
    main()

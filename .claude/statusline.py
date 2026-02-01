#!/usr/bin/env python3
import json
import sys
import subprocess
import os

# ANSI color codes
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
RESET = "\033[0m"

def get_color(pct):
    if pct < 20:
        return GREEN
    elif pct <= 40:
        return YELLOW
    else:
        return RED

def make_bar(pct, width=50):
    filled = int(pct * width / 100)
    empty = width - filled
    return "#" * filled + "-" * empty

def main():
    try:
        data = json.load(sys.stdin)

        # Folder name
        cwd = data.get("workspace", {}).get("current_dir", "")
        folder = os.path.basename(cwd) if cwd else "?"

        # Git branch
        try:
            result = subprocess.run(
                ["git", "-C", cwd, "symbolic-ref", "--short", "HEAD"],
                capture_output=True, text=True, timeout=2
            )
            git_branch = result.stdout.strip() if result.returncode == 0 else "no-git"
        except:
            git_branch = "no-git"

        # Model name
        model = data.get("model", {}).get("display_name", "?")

        # Context window usage (subtract 32K output buffer from total)
        usage = data.get("context_window", {}).get("current_usage")
        total_window = data.get("context_window", {}).get("context_window_size", 200_000)
        window_size = total_window - 32_000  # effective input window

        if usage and window_size:
            input_tokens = usage.get("input_tokens", 0)
            cache_creation = usage.get("cache_creation_input_tokens", 0)
            cache_read = usage.get("cache_read_input_tokens", 0)

            current = input_tokens + cache_creation + cache_read
            pct = int(current * 100 / window_size) if window_size else 0

            color = get_color(pct)
            bar = make_bar(pct)
            line1 = f"{color}{bar} {pct}%{RESET}"
            line2 = f"{folder} | {git_branch} | {model} | {current//1000}K/{window_size//1000}K"
        else:
            line1 = f"{GREEN}{make_bar(0)} 0%{RESET}"
            line2 = f"{folder} | {git_branch} | {model}"

        print(f"{line1}\n{line2}", end="")
    except Exception as e:
        print(f"error: {e}", end="")

if __name__ == "__main__":
    main()

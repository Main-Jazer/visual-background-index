#!/usr/bin/env python3
"""
JaZeR Documentation Builder

This script orchestrates the generation of all documentation and index files.
It ensures that:
1. The project tree is scanned and saved to docs/tree.txt
2. The effect manifest is generated in docs/effects.manifest.json
3. The visual index application is built to docs/index.html

Usage:
  python tools/build_site.py
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(cmd, description):
    print(f"--- {description} ---")
    try:
        # Run command and pipe output to stdout
        subprocess.run(cmd, check=True, shell=True)
        print("OK.\n")
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        sys.exit(1)

def main():
    # Determine repo root (assumed to be parent of 'tools')
    script_dir = Path(__file__).parent.resolve()
    repo_root = script_dir.parent
    
    # Change working directory to repo root to ensure relative paths work as expected
    os.chdir(repo_root)
    print(f"Working directory: {os.getcwd()}")
    
    # Ensure docs directory exists
    docs_dir = repo_root / "docs"
    docs_dir.mkdir(exist_ok=True)
    
    # 1. Generate Tree
    # python tools/tree_scan.py --out docs/tree.txt
    run_command(
        f'{sys.executable} tools/tree_scan.py . --out "docs/tree.txt"',
        "Generating Project Tree (docs/tree.txt)"
    )

    # 2. Generate Manifest
    # ...
    run_command(
        f'{sys.executable} tools/generate_effect_manifest.py --root . --out-json "docs/effects.manifest.json" --out-md "docs/effects.manifest.md"',
        "Generating Effect Manifest (docs/effects.manifest.json)"
    )

    # Cleanup old docs/index.html if it exists to avoid confusion
    old_index = docs_dir / "index.html"
    if old_index.exists():
        print(f"Removing old index: {old_index}")
        old_index.unlink()

    # 3. Build Index App
    # python tools/build_index_app.py --root . --manifest "docs/effects.manifest.json" --out "index.html" --url-prefix ""
    run_command(
        f'{sys.executable} tools/build_index_app.py --root . --manifest "docs/effects.manifest.json" --out "index.html" --url-prefix ""',
        "Building Index App (index.html)"
    )
    
    print("=== Build Complete ===")
    print("Open the following link to view your gallery:")
    print(f"  {(repo_root / 'index.html').as_uri()}")

if __name__ == "__main__":
    main()

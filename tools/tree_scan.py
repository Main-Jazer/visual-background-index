import os
import sys
from pathlib import Path

DEFAULT_SCAN_PATH = "."

IGNORE_DEFAULT = {
    ".git", "node_modules", "__pycache__", ".DS_Store",
    "dist", "build", ".next", ".vite", ".cache",
    ".idea", ".vscode", ".pytest_cache"
}

def safe_children(p: Path, ignore_names: set[str]):
    try:
        items = list(p.iterdir())
    except (PermissionError, OSError):
        return []
    items = [x for x in items if x.name not in ignore_names]
    items.sort(key=lambda x: (not x.is_dir(), x.name.lower()))  # dirs first
    return items

def build_tree_lines(root: Path, max_depth: int | None, ignore_names: set[str]) -> list[str]:
    lines: list[str] = [str(root)]

    def walk_dir(dir_path: Path, prefix: str = "", depth: int = 0):
        if max_depth is not None and depth >= max_depth:
            return

        items = safe_children(dir_path, ignore_names)
        for i, item in enumerate(items):
            is_last = (i == len(items) - 1)
            branch = "└── " if is_last else "├── "
            lines.append(prefix + branch + item.name + ("/" if item.is_dir() else ""))

            if item.is_dir():
                extension = "    " if is_last else "│   "
                walk_dir(item, prefix + extension, depth + 1)

    walk_dir(root)
    return lines

def main():
    args = sys.argv[1:]
    out_file = None
    max_depth = None

    # Flags
    if "--out" in args:
        i = args.index("--out")
        if i + 1 < len(args):
            out_file = args[i + 1]
            del args[i:i+2]

    if "--max-depth" in args:
        i = args.index("--max-depth")
        if i + 1 < len(args):
            try:
                max_depth = int(args[i + 1])
            except ValueError:
                max_depth = None
            del args[i:i+2]

    path_str = args[0] if len(args) > 0 else DEFAULT_SCAN_PATH

    root = Path(path_str).expanduser()
    try:
        root = root.resolve()
    except Exception:
        pass

    if not root.exists() or not root.is_dir():
        print(f"Error: Directory not found or not a folder: {root}")
        print(f'Try: python tree_scan.py "{DEFAULT_SCAN_PATH}"')
        sys.exit(1)

    ignore = set(IGNORE_DEFAULT)
    lines = build_tree_lines(root, max_depth=max_depth, ignore_names=ignore)
    text = "\n".join(lines)

    if out_file:
        out_path = Path(out_file)
        out_path.write_text(text, encoding="utf-8")
        print(f"Wrote tree to: {out_path.resolve()}")
    else:
        print(text)

if __name__ == "__main__":
    main()

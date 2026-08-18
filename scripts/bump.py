#!/usr/bin/env python
"""
Laptop Store version bump. Semver: vMAJOR.MINOR.PATCH.

VERSION holds the last SHIPPED build. Bump BEFORE the push that closes tracker
items, then stamp that version into the sheet's Fixed In / Delivered In column.
One version per shipped batch, not per item.

    patch  fixes and corrections          v0.1.0 -> v0.1.1
    minor  a feature or a section rebuild  v0.1.1 -> v0.2.0
    major  a release                       v0.9.3 -> v1.0.0

Usage:
    python scripts/bump.py            # patch
    python scripts/bump.py minor
    python scripts/bump.py major
    python scripts/bump.py --show     # print current, change nothing

Keeps package.json's "version" field in step.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = ROOT / "VERSION"
PACKAGE_JSON = ROOT / "package.json"


def read():
    raw = VERSION_FILE.read_text(encoding="utf-8").strip()
    m = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", raw)
    if not m:
        sys.exit(f"VERSION is not semver: {raw!r}")
    return tuple(int(g) for g in m.groups())


def bump(part):
    major, minor, patch = read()
    if part == "major":
        major, minor, patch = major + 1, 0, 0
    elif part == "minor":
        minor, patch = minor + 1, 0
    elif part == "patch":
        patch += 1
    else:
        sys.exit(f"unknown part: {part!r} (major, minor, patch)")
    return f"v{major}.{minor}.{patch}"


def write(new):
    VERSION_FILE.write_text(new + "\n", encoding="utf-8")
    if PACKAGE_JSON.exists():
        text = PACKAGE_JSON.read_text(encoding="utf-8")
        patched = re.sub(r'("version"\s*:\s*")[^"]*(")',
                         lambda m: m.group(1) + new.lstrip("v") + m.group(2),
                         text, count=1)
        if patched != text:
            PACKAGE_JSON.write_text(patched, encoding="utf-8")


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "patch"
    if arg in ("--show", "-s", "show"):
        major, minor, patch = read()
        print(f"v{major}.{minor}.{patch}")
    else:
        new = bump(arg)
        write(new)
        print(new)

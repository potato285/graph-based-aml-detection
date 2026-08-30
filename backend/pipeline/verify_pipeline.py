#!/usr/bin/env python3
"""
Pipeline verification entrypoint wrapper.
Delegates to backend.tests.verify_pipeline for full end-to-end health checks.
"""
import os
import sys
import pathlib

repo_root = pathlib.Path(__file__).resolve().parents[2]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from backend.tests.verify_pipeline import main

if __name__ == "__main__":
    main()


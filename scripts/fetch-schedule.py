#!/usr/bin/env python3
"""Download and trim ust-archive/schedule (config=classes) to the catalog terms/ids."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSES_PATH = ROOT / "courses.json"
OUT_PATH = ROOT / "assets" / "data" / "schedule.json"

# Exact Hub fetch used by this script:
#   from huggingface_hub import hf_hub_download
#   hf_hub_download(
#       repo_id="ust-archive/schedule",
#       repo_type="dataset",
#       revision="refs/convert/parquet",
#       filename="classes/train/0000.parquet",
#   )
FETCH_COMMAND = (
    "python -c \"from huggingface_hub import hf_hub_download; "
    "print(hf_hub_download(repo_id='ust-archive/schedule', repo_type='dataset', "
    "revision='refs/convert/parquet', filename='classes/train/0000.parquet'))\""
)


def main() -> int:
    try:
        import pyarrow.parquet as pq  # type: ignore
        from huggingface_hub import hf_hub_download
    except ImportError:
        print(
            "Missing Python deps. Install with: pip install huggingface_hub pyarrow",
            file=sys.stderr,
        )
        return 1

    print("Loading catalog ids and term codes from courses.json …", flush=True)
    with COURSES_PATH.open() as handle:
        courses = json.load(handle)
    term_codes = sorted({row["term_code"] for row in courses})
    course_ids = {row["id"] for row in courses}
    print(f"  terms={term_codes} catalog_ids={len(course_ids)}", flush=True)

    print("Downloading ust-archive/schedule classes parquet …", flush=True)
    print(f"  {FETCH_COMMAND}", flush=True)
    parquet_path = hf_hub_download(
        repo_id="ust-archive/schedule",
        repo_type="dataset",
        revision="refs/convert/parquet",
        filename="classes/train/0000.parquet",
    )

    table = pq.read_table(parquet_path)
    records = table.to_pylist()
    trimmed = [
        row
        for row in records
        if row.get("term_code") in term_codes and row.get("course_id") in course_ids
    ]
    print(f"  kept {len(trimmed)} / {len(records)} class rows", flush=True)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    def default(value: object) -> str:
        if hasattr(value, "isoformat"):
            return value.isoformat()  # type: ignore[no-any-return]
        return str(value)

    with OUT_PATH.open("w") as handle:
        json.dump(trimmed, handle, default=default)
        handle.write("\n")
    print(f"Wrote {OUT_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

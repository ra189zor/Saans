"""
Build the WHO handbook search index. Run once.

    conda activate saans
    python notebooks/build_who_index.py

Chunks books/WHO Operational Handbook PDF.pdf, embeds every chunk with
all-MiniLM-L6-v2 on onnxruntime, and writes backend/models/who_index.npz.

The index is small enough to commit. The 90 MB encoder is not, and downloads
itself on first use.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import rag


def main():
    print(f"handbook: {rag.HANDBOOK}")
    if not os.path.exists(rag.HANDBOOK):
        raise SystemExit(f"Not found: {rag.HANDBOOK}")

    print("chunking + embedding (first run downloads the ~90 MB encoder) ...")
    n, path = rag.build_index()
    size = os.path.getsize(path) / 1e6
    print(f"\n{n} chunks -> {path}  ({size:.1f} MB)")

    for q in ("What is the 4-month regimen?", "When should I start TB treatment?"):
        top = rag.retrieve(q, top_k=2)
        print(f"\n  \"{q}\"")
        for hit in top:
            where = f"p{hit['page']}" + (f" · {hit['section']}" if hit["section"] else "")
            print(f"    {hit['score']:.3f}  {where}  {hit['text'][:90]}...")


if __name__ == "__main__":
    main()

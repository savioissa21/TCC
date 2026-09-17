"""Prevent the same normalized review from leaking across experimental splits."""
import hashlib
import unicodedata


def assert_disjoint_splits(splits):
    seen = {}
    for split, examples in splits.items():
        for example in examples:
            normalized = " ".join(unicodedata.normalize("NFC", example.text).casefold().split())
            digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
            previous = seen.setdefault(digest, split)
            if previous != split:
                raise ValueError(f"Dataset leakage between {previous} and {split}; review SHA256={digest}")


def dataset_checksums(directory):
    return {str(path.relative_to(directory)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted(directory.rglob("*.txt"))}

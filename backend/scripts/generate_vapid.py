"""
Generate a VAPID keypair for Web Push (free — no third-party service).

Usage:
    cd backend
    python scripts/generate_vapid.py

Copy the printed values into your .env. The PUBLIC key is base64url of the
raw uncompressed EC public point (the browser's applicationServerKey); the
PRIVATE key is base64url of the 32-byte private scalar, which pywebpush accepts.
Only the `cryptography` package (already a pywebpush dependency) is required.
"""

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())

    # 32-byte raw private scalar
    private_raw = private_key.private_numbers().private_value.to_bytes(32, "big")

    # 65-byte uncompressed public point (0x04 || X || Y)
    public_raw = private_key.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )

    print("# ── Add these to your .env ─────────────────────────────")
    print(f"VAPID_PUBLIC_KEY={b64url(public_raw)}")
    print(f"VAPID_PRIVATE_KEY={b64url(private_raw)}")
    print("VAPID_SUBJECT=mailto:you@example.com")


if __name__ == "__main__":
    main()

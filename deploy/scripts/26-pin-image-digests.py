#!/usr/bin/env python3
"""Render a docker compose override that pins every service to an image digest.

Why: docker compose recreates a container when its service config changes, and
the image reference string is part of that config. The base compose file
references owned images by a per-deploy tag (umbra-*:sha-<commit>), so the
string changes on every deploy and ALL owned containers are recreated even when
their content is byte-for-byte identical. Pinning each service to an immutable
@sha256 digest keeps the string stable across deploys whenever the digest is
unchanged, so only services whose image actually changed are recreated.

Resolution:
- Owned images (umbra-*) are pinned to the digest of the just-pulled deploy tag.
  With build-layer caching, unchanged source yields an identical digest.
- External images (e.g. marzban, vaultwarden) are pinned to the digest of the
  currently running container, so upstream :latest movement never silently
  recreates a stateful service. Bumping them becomes a deliberate change.

Output: a compose override document on stdout. Prints nothing if no digest can
be resolved, so the caller can fall back to tag-based startup.

Run from the compose project directory (where docker-compose.yml lives), with
IMAGE_REGISTRY / IMAGE_NAMESPACE / IMAGE_TAG exported as during a deploy.
"""
from __future__ import annotations

import json
import os
import subprocess


def _run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True)


def _service_images() -> dict[str, str]:
    proc = _run(["docker", "compose", "config", "--format", "json"])
    if proc.returncode != 0:
        return {}
    try:
        config = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return {}
    services = config.get("services", {})
    return {name: (svc.get("image") or "") for name, svc in services.items()}


def _repo_digest_of_ref(ref: str) -> str:
    if not ref:
        return ""
    proc = _run([
        "docker", "inspect",
        "--format", "{{if .RepoDigests}}{{index .RepoDigests 0}}{{end}}",
        ref,
    ])
    return proc.stdout.strip() if proc.returncode == 0 else ""


def _running_repo_digest(container: str) -> str:
    image_id = _run(["docker", "inspect", "--format", "{{.Image}}", container])
    if image_id.returncode != 0:
        return ""
    return _repo_digest_of_ref(image_id.stdout.strip())


def main() -> None:
    registry = os.environ.get("IMAGE_REGISTRY", "")
    namespace = os.environ.get("IMAGE_NAMESPACE", "")
    owned_prefix = f"{registry}/{namespace}/umbra-" if registry and namespace else ""

    pinned: dict[str, str] = {}
    for name, ref in _service_images().items():
        if not ref:
            continue
        is_owned = "/umbra-" in ref or (bool(owned_prefix) and ref.startswith(owned_prefix))
        if is_owned:
            digest = _repo_digest_of_ref(ref)
        else:
            digest = _running_repo_digest(name) or _repo_digest_of_ref(ref)
        if digest:
            pinned[name] = digest

    if not pinned:
        # Nothing resolvable; emit nothing so the caller falls back safely.
        return

    lines = ["services:"]
    for name in sorted(pinned):
        lines.append(f"  {name}:")
        lines.append(f"    image: \"{pinned[name]}\"")
    print("\n".join(lines))


if __name__ == "__main__":
    main()

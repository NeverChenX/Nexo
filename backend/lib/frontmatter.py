import re


def parse_frontmatter(content: str) -> dict:
    if not content.startswith("---"):
        return {"frontmatter": {}, "body": content}

    end_index = content.find("\n---", 3)
    if end_index == -1:
        return {"frontmatter": {}, "body": content}

    fm_raw = content[4:end_index].strip()
    body = content[end_index + 4:]
    if body.startswith("\n"):
        body = body[1:]

    frontmatter: dict = {}

    for line in fm_raw.split("\n"):
        match = re.match(r"^(\w+):\s*(.*)$", line)
        if not match:
            continue
        key, value = match.group(1), match.group(2)

        if key == "tags":
            cleaned = value.strip().strip("[]").strip()
            if cleaned:
                frontmatter["tags"] = [t.strip() for t in cleaned.split(",") if t.strip()]
            else:
                frontmatter["tags"] = []
        else:
            frontmatter[key] = value

    return {"frontmatter": frontmatter, "body": body}


def serialize_frontmatter(frontmatter: dict, body: str) -> str:
    entries: list[str] = []

    if frontmatter.get("tags") and len(frontmatter["tags"]) > 0:
        entries.append(f"tags: [{', '.join(frontmatter['tags'])}]")

    for key, value in frontmatter.items():
        if key == "tags":
            continue
        if value is not None:
            entries.append(f"{key}: {value}")

    if not entries:
        return body

    return f"---\n{chr(10).join(entries)}\n---\n{body}"


def update_tags(content: str, tags: list[str]) -> str:
    parsed = parse_frontmatter(content)
    fm = parsed["frontmatter"]
    fm["tags"] = tags
    return serialize_frontmatter(fm, parsed["body"])

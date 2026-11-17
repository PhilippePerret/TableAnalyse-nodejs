#!/usr/bin/env python3
# Hook Stop : rejette une réponse de Claude contenant une négation sur
# son propre travail (« je n'ai pas… », « pas testé », « non vérifié »…).
import json, re, sys

PATTERNS = [
    r"\bje n['’](?:ai|avais) (?:pas|rien|jamais)\b",
    r"\bje ne l['’](?:ai|avais) pas\b",
    r"\bje ne (?:les|l['’]|me|m['’])?\s*suis pas\b",
    r"\b(?:pas|non|jamais) (?:encore )?(?:été )?(?:testée?s?|vérifiée?s?|poussée?s?|touchée?s?|commitée?s?|lancée?s?|essayée?s?|contrôlée?s?)\b",
    r"\bsans (?:l['’]|les )?avoir (?:testé|vérifié|lancé|essayé|contrôlé)\b",
]
RX = re.compile("|".join(PATTERNS), re.IGNORECASE)

def last_assistant_text(data):
    if data.get("last_assistant_message"):
        return data["last_assistant_message"]
    texts = []
    try:
        with open(data["transcript_path"], encoding="utf-8") as f:
            for line in f:
                try:
                    e = json.loads(line)
                except Exception:
                    continue
                msg = e.get("message") or {}
                if e.get("type") == "user" and isinstance(msg.get("content"), str):
                    texts = []  # nouveau message de l'utilisateur
                elif e.get("type") == "assistant":
                    for c in msg.get("content") or []:
                        if isinstance(c, dict) and c.get("type") == "text":
                            texts.append(c["text"])
    except Exception:
        return ""
    return "\n".join(texts)

data = json.load(sys.stdin)
if data.get("stop_hook_active"):
    sys.exit(0)
found = RX.search(last_assistant_text(data))
if found:
    print(json.dumps({
        "decision": "block",
        "reason": f"Négation interdite (« {found.group(0)} »). Réécris la réponse sans cette phrase : après une correction, « Fait. » seul."
    }, ensure_ascii=False))

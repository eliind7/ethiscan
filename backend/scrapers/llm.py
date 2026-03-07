import os
import json
from typing import Optional

import anthropic

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are a compliance analyst. You will be given a news article about a company.
Your job is to determine if it contains ANY mention relevant to sanctions screening.

Flag as relevant if the article mentions: sanctions (being applied OR lifted OR exempted), embargo,
terror financing, dual-use goods, export control, money laundering, debarment, or links to
sanctioned individuals or jurisdictions. Exemptions and waivers are also relevant.

Severity guide:
5 = direct sanctions listing or new enforcement action
4 = sanctions violation or investigation
3 = sanctions exemption, waiver, or partial relief
2 = indirect link (subsidiary, related entity, jurisdiction)
1 = vague or historical mention only

Respond ONLY with a JSON object in this exact format:
{
  "relevant": true or false,
  "snippet": "1-sentence summary of the finding, or null if not relevant",
  "keyword_match": "the primary keyword that matched, or null",
  "severity": 1 to 5 integer, or null if not relevant
}"""


async def extract_signal(company_name: str, article: dict) -> Optional[dict]:
    """
    Use Claude to extract a sanctions-relevant signal from a news article.
    Returns a signal dict or None if the article is not relevant.
    """
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    user_message = f"""Company: {company_name}

Article title: {article['title']}
Published: {article['published']}
Content: {article['summary']}

Is this article relevant to sanctions risk for {company_name}?"""

    try:
        message = await client.messages.create(
            model=MODEL,
            max_tokens=256,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
    except Exception:
        return None

    raw = message.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        result = json.loads(raw)
    except (json.JSONDecodeError, Exception):
        return None

    if not result.get("relevant"):
        return None

    return {
        "list_name": "Adverse Media",
        "entry_id": None,
        "source_type": "adverse_media",
        "date": article.get("published", ""),
        "url": article.get("url", ""),
        "snippet": result.get("snippet", article["title"]),
        "match_confidence": None,
        "severity": result.get("severity", 1),
        "keyword_match": result.get("keyword_match"),
    }

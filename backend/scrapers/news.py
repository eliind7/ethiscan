import feedparser
import httpx

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"

SANCTIONS_KEYWORDS = [
    "sanctions", "sanctioned", "embargo", "embargoed",
    "terror financing", "terrorist financing",
    "dual-use", "export control", "money laundering",
    "debarment", "blacklist", "watchlist",
]


async def fetch_news(company_name: str, limit: int = 10) -> list[dict]:
    """
    Fetch recent news articles mentioning the company + sanctions-related keywords.
    Returns a list of raw articles: {title, url, published, summary}
    """
    query = f'"{company_name}" sanctions OR embargo OR "export control" OR "terror financing"'
    params = {"q": query, "hl": "en", "gl": "US", "ceid": "US:en"}

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        resp = await client.get(GOOGLE_NEWS_RSS, params=params)
        resp.raise_for_status()
        content = resp.text

    feed = feedparser.parse(content)

    articles = []
    for entry in feed.entries[:limit]:
        articles.append({
            "title": entry.get("title", ""),
            "url": entry.get("link", ""),
            "published": entry.get("published", ""),
            "summary": entry.get("summary", ""),
        })

    return articles


def is_sanctions_relevant(text: str) -> bool:
    """Quick pre-filter before sending to LLM — skip clearly irrelevant articles."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in SANCTIONS_KEYWORDS)

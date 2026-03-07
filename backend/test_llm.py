import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from backend.scrapers.news import fetch_news, is_sanctions_relevant
from backend.scrapers.llm import extract_signal


async def main():
    company = "Rosneft"
    print(f"Fetching news for: {company}\n")

    articles = await fetch_news(company)
    print(f"Articles returned: {len(articles)}")

    for i, article in enumerate(articles):
        print(f"\n--- Article {i+1} ---")
        print(f"  Title   : {article['title']}")
        print(f"  Published: {article['published']}")
        text = article['title'] + " " + article['summary']
        passes_filter = is_sanctions_relevant(text)
        print(f"  Passes keyword filter: {passes_filter}")

        if passes_filter:
            print(f"  Running LLM extraction...")
            signal = await extract_signal(company, article)
            if signal:
                print(f"  SIGNAL FOUND:")
                print(f"    snippet      : {signal['snippet']}")
                print(f"    severity     : {signal['severity']}")
                print(f"    keyword_match: {signal['keyword_match']}")
            else:
                print(f"  LLM: not relevant")

    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())

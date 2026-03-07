import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from backend.scrapers.opensanctions import search_sanctions, search_peps

COMPANIES = [
    ("H&M", "SE"),
    ("Oriflame", "SE"),
    ("Kinnevik", "SE"),
    ("Tele2", "SE"),
    ("Apoteket", "SE"),
    ("Coop", "SE"),
    ("Axfood", "SE"),
    ("Embracer Group", "SE"),
    ("Swedbank", "SE"),
    ("Lyko", "SE"),
    # Known sanctioned entity — should return hits
    ("Rosneft", "RU"),
]


async def test_company(name: str, country: str):
    sanctions, peps = await asyncio.gather(
        search_sanctions(name, country),
        search_peps(name),
    )

    print(f"\n{'='*50}")
    print(f"  {name}")
    print(f"{'='*50}")
    print(f"  Sanctions hits : {len(sanctions)}")
    for m in sanctions:
        print(f"    - {m.entity_name} | confidence: {m.match_confidence:.2f} | severity: {m.severity} | lists: {', '.join(m.datasets[:2])}")

    print(f"  PEP hits       : {len(peps)}")
    for m in peps:
        print(f"    - {m.entity_name} | confidence: {m.match_confidence:.2f}")


async def main():
    print("Running sanctions screening for 10 companies...\n")
    for name, country in COMPANIES:
        await test_company(name, country)
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())

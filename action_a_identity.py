import csv
import json
import requests
import time
import os

# Using the free tier endpoint from ABPI.se
API_URL = "https://abpi.se/api/{org_number}/data"

def fetch_company_data(org_number):
    """Fetches real Swedish company data from the ABPI.se API."""
    
    # The API expects the org number format with a hyphen (e.g. 556074-7551)
    if len(org_number) == 10 and '-' not in org_number:
        org_number = f"{org_number[:6]}-{org_number[6:]}"
        
    url = API_URL.format(org_number=org_number)
    
    headers = {
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract key identifying information needed for Action A
            basic_info = data.get("basic_info", {})
            canonical_name = basic_info.get("legal_name") or basic_info.get("name", "Unknown")
            
            location_data = data.get("location", {})
            municipality = location_data.get("municipality", "Unknown")
            
            # Extract key personnel (Board members and Management) for PEP/Sanctions checks
            key_people = []
            
            # Basic contact
            contact = data.get("contact_person")
            if contact and contact.get("name"):
                key_people.append(f"{contact.get('name')} ({contact.get('role', 'Contact')})")
                
            # Full roles list
            roles_data = data.get("roles", {})
            # roles might be None in some API responses, we shouldn't crash
            if roles_data and isinstance(roles_data, dict) and "role_groups" in roles_data:
                for group in roles_data.get("role_groups", []):
                    group_name = group.get("name", "")
                    if group_name in ["Management", "Board"]:
                        for r in group.get("roles", []):
                            person_name = r.get("name")
                            person_role = r.get("role")
                            if person_name and person_role:
                                key_people.append(f"{person_name} ({person_role})")
            
            # Deduplicate the list
            key_people = list(set(key_people))

            return {
                "found": True,
                "identity": {
                    "canonical_name": canonical_name,
                    "org_number": org_number,
                    "location": municipality,
                    "key_people": key_people
                },
                "raw_data": data
            }
        else:
            return {
                "found": False,
                "error": f"HTTP {response.status_code}",
                "raw_response": response.text
            }
    except Exception as e:
        return {
            "found": False,
            "error": str(e)
        }

def process_csv(filepath):
    if not os.path.exists(filepath):
        print(f"[!] Error: File '{filepath}' not found.")
        return []

    results = []
    print(f"--- Loading Input CSV: {filepath} ---")
    
    with open(filepath, mode='r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            supplier_name = row.get('supplier_name', 'Unknown')
            country = row.get('country', 'Unknown')
            org_number = row.get('org_number')
            org_number = org_number.strip() if org_number else ''            
            print(f"[*] Querying ABPI.se for: {supplier_name} (Org: {org_number})")
            
            if org_number:
                api_result = fetch_company_data(org_number)
            else:
                api_result = {"found": False, "error": "No org_number provided in CSV"}
            
            # Rate limiting / politeness for the free tier API
            time.sleep(1)
            
            row_data = {
                "input_supplier": supplier_name,
                "input_country": country,
                "input_org_number": org_number,
                "action_a_result": api_result
            }
            results.append(row_data)
            
    return results

if __name__ == "__main__":
    csv_file_path = "suppliers_sample.csv"
    print("\n=== Ethiscan Hackathon: Action A (ABPI.se Integration) ===\n")
    
    verified_data = process_csv(csv_file_path)
    
    # For readability in the terminal, we will just print the extracted identity payloads
    print("\n=== Action A: Extracted Identity Profiles ===")
    for item in verified_data:
        supplier = item.get("input_supplier")
        res = item.get("action_a_result", {})
        if res.get("found"):
            print(f"\n[+] {supplier} -> Verified Identity:")
            print(json.dumps(res.get("identity"), indent=2, ensure_ascii=False))
        else:
            print(f"\n[-] {supplier} -> Failed: {res.get('error')}")

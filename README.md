# Scholarship Assistant – Verified African Scholarships

<!-- README for Scholarship Assistant Actor -->

## Overview
The **Scholarship Assistant** is an Apify Actor that aggregates verified African scholarship and essay‑competition opportunities from trusted sources. It scrapes each listing, extracts structured information (title, provider, deadline, eligibility, required documents, apply link) and flags entries as **trusted**.

A scholarship is considered trusted when:
- Its apply‑link belongs to a domain listed in `trustedDomains`, **or**
- The scraper finds at least **three** eligibility criteria **and** at least **three** required‑document items.

## Features
- **Domain whitelist** – configurable list of verified funder domains.
- **Completeness check** – ensures at least three eligibility points and three required documents before marking as trusted.
- **Configurable start URLs** – defined via the input schema.
- **JSON dataset output** – each record follows a clear schema.
- **Ready for publishing** – includes input and output schemas for the Apify Store.

## Input Schema (`.actor/input_schema.json`)
- `startUrls` – array of URLs to scrape (e.g., `https://scholarsworld.ng/all-scholarships/`).
- `trustedDomains` – whitelist of domains (e.g., `airbus.com`, `docs.google.com`).
- `maxRequestsPerCrawl` – optional limit to keep demo runs small.

## Output Schema (`.actor/output_schema.json`)
The output schema title is **"Verified African Scholarships"**. Each dataset item contains:
- `title`
- `provider`
- `deadline`
- `eligibility` (array of strings)
- `requiredDocuments` (array of strings)
- `applyLink`
- `isTrusted` (boolean)
- `sourceUrl`

## Quick Start
```bash
# Install dependencies
npm install

# Run locally
apify run
```
The actor reads input from `storage/key_value_stores/default/INPUT.json` and stores results in `storage/datasets/default/`.

## Deploy to Apify
1. Log in to the Apify CLI:
```bash
apify login
```
2. Push the actor to the platform:
```bash
apify push
```
3. Configure the input (start URLs and trusted domains) in the Apify Console and run the actor.

## Example Output
```json
{
  "title": "African Women in Science Scholarship",
  "provider": "African Union",
  "deadline": "2024-12-31",
  "eligibility": ["Women", "Undergraduate", "STEM fields"],
  "requiredDocuments": ["Transcripts", "Recommendation letters", "Personal statement"],
  "applyLink": "https://airbus.com/scholarship/apply",
  "isTrusted": true,
  "sourceUrl": "https://scholarsworld.ng/all-scholarships/..."
}
```

## License
MIT – feel free to modify and reuse for hackathon projects.

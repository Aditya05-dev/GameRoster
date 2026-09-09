# Upgrade notes

## Fixed
- PostgreSQL `pg_trgm` migration ordering.
- Frontend production architecture no longer depends on `window.storage`.
- New frontend no longer exposes the Stage-1 `GameMaster/admin123` demo credential.
- Public build API now also returns the character name.

## Added
- Catalog API: equipment, materials, domains/stages, events.
- Guides API with draft/publish ownership rules.
- Tier-list read API with tiers and entries.
- Social API: bookmarks, likes, reports.
- Maps and marker APIs with moderator/admin marker creation.
- UID public-profile adapter endpoint.
- Modular React frontend and responsive navigation.
- Account dashboard and admin character-entry screen.
- Interactive map renderer for configured map images/markers.

## Deliberately not fabricated
- Live/current character data.
- Licensed interactive map artwork.
- Third-party UID provider credentials or undocumented scraping behavior.
- Game-specific farming formulas where the supplied files do not contain authoritative material-cost data.

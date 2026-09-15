# orc-rules-data

Machine-readable rules of the Pathfinder Second Edition Remaster, published
under the ORC License. Engine-neutral: plain JSON plus JSON Schema, no runtime.

## Layout

- `data/<type>/<id>.json` — one record per file. Types: trait, condition, skill,
  action, feat, feature, ancestry, heritage, background, class, spell, item.
- `i18n/en.json` — every human-readable string, keyed `<id>.<field>`.
- `schema/` — JSON Schema (draft 2020-12) for every record type.
- `books.json` — source books, page counts and known rules revisions.
- `reserved/` — hashed list of Paizo Reserved Material terms that must never
  appear in the data, plus an allowlist for false positives.
- `validator/` — the checks run in CI (`npm run validate`).
- `tools/` — maintainer tooling; not needed to use the data.
- `migrations/` — id migration maps for major versions.

## Using the data

Download the archive attached to a release tag (`vX.Y.Z+<revision>`), or add
this repository as a git submodule pinned to a tag. Read `data/` and
`i18n/en.json`; resolve references by id. Text fields contain light markup:
`[[id|label]]` links to another record and `{1a} {2a} {3a} {r} {f}` are action
cost tokens.

## Conventions

- `source.page` is the printed page number of the book named in `source.book`.
- Items with `variants` (for example potions by strength) carry the lowest
  variant's `level` and `priceCp` at the top level; each variant lists its own.
- `review` is `"auto"` for records accepted by automated cross-checks and
  `"human"` for records a person verified against the book. Class and ancestry
  records must be `"human"`.
- `ancestry.languages` holds language identifiers (lowercase slugs), not
  display names.
- Text markup: paragraphs are separated by a blank line, lists use `- ` at
  line start, emphasis uses `**bold**`; links `[[id|label]]`; action tokens
  `{1a} {2a} {3a} {r} {f}`.

## Versioning

- patch: text fixes, typos, page numbers
- minor: new records, new optional schema fields
- major: renamed or removed ids, new required fields, markup changes — always
  with a file in `migrations/`

## Licensing

Data: ORC License, see `LICENSE-DATA`. Schemas, validator and tools: MIT, see
`LICENSE-CODE`. This project is not affiliated with or endorsed by Paizo Inc.

## Contributing

See `CONTRIBUTING.md`. Every pull request is validated by CI; you do not need
a local toolchain to fix a typo.

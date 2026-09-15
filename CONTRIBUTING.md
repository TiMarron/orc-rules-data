# Contributing

## Rules

1. One record is one file. Ids never change after a release; if a name is
   wrong, fix `i18n/en.json`, not the id.
2. Every text change cites the book, printed page and rules revision it was
   made against (the `source` field). "I remember it differently" is not a source.
3. Text that deliberately differs from the book — usually because Reserved
   Material was removed — carries `"edited": true` and an `editNote`
   explaining what changed and why.
4. Reserved Material (Paizo proper nouns, deities, nations, organizations,
   characters, artwork descriptions, setting lore) is never added, not even as
   an example. CI rejects it.

## Workflow

- Edit JSON directly in the GitHub web editor or locally.
- Locally: `npm ci`, then `npm run validate` (data) and `npm test` (tooling).
- Open a pull request and fill in the template. CI must be green.

## Review status

`review` is `"auto"` for records accepted by automated cross-checks and
`"human"` for records a person has verified against the book. Set it to
`"human"` when you have checked the whole record, not just the line you edited.

## Errata

When Paizo publishes errata, open an issue listing the affected entries from
the official FAQ page. Each fix is its own commit and bumps `source.revision`.

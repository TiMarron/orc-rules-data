# orc-rules-data

Machine-readable rules of the Pathfinder Second Edition Remaster, published
under the ORC License. Engine-neutral: plain JSON plus JSON Schema, no runtime.

## Layout

- `data/<type>/<id>.json` — one record per file. Types: trait, condition, skill,
  action, feat, feature, ancestry, heritage, background, class, spell, item,
  school, thesis.
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
- An item's `activations` list each way it can be activated; an item may print
  several, and each may be named. An activation states how it is spent — an
  action cost in `actions`, a duration in `time`, or `castASpell: true` — and
  carries its own `traits`, which are what the rules key on: `manipulate`
  provokes a reaction, `concentrate` can be disrupted. These are separate from
  the item's own traits in the envelope.
- `review` says who vouched for a record. `"auto"` means it passed the
  automated cross-checks and nothing else; `"assistant"` means an AI
  assistant checked it against the sources and left a note saying what it
  found; `"human"` means a person verified it against the book. Class and
  ancestry records may not be `"auto"`. Every record in the first import is
  `"auto"` or `"assistant"` — no human sign-off has happened yet. An
  assistant's edit made without a recorded reviewer is counted as
  `"assistant"`, so the field understates rather than overstates.
- `ancestry.languages` holds language identifiers (lowercase slugs), not
  display names.
- `ancestry.senses` carries what the book prints in the ancestry's own entry —
  darkvision or low-light vision — beside its hit points and speed.
- `ancestry.grants` is what the ancestry hands every member at 1st level beyond
  its statistics: the dwarf's free clan dagger (with `item` pointing at the
  record), the halfling's Keen Eyes. A sense is not repeated here.
- A spellcasting class names its tradition in `proficiencies.traditions`, or
  sets `traditionsVary` when the character's own choice fixes it.
- A spellcasting class may describe how it casts in `spellcasting`: prepared or
  spontaneous, where its spells come from, and its spells-per-day table as twenty
  rows (index = level − 1); a class that keeps a spellbook adds `spellbook`, what
  it holds at 1st level and gains per level. A school's curriculum slots are not
  in that table — `spellcasting.curriculum` states the rule that adds them.
- A ranged weapon points at the ammunition it fires in `weapon.ammunition`.
- Text markup: paragraphs are separated by a blank line, lists use `- ` at
  line start, emphasis uses `**bold**`; links `[[id|label]]`; action tokens
  `{1a} {2a} {3a} {r} {f}`.
- Versatile heritages (belonging to no single ancestry) set `versatile: true`
  instead of `ancestry`.
- An ancestry feat for a versatile heritage sets `versatile: true` instead of
  `ancestry`, the same way the heritage itself does.
- A wizard's 1st-level choices are records of their own, not feats or features:
  a `school` (arcane school) carries its `curriculum` — cantrips plus one spell list
  per rank — and its `schoolSpells` focus spells; a `thesis` (arcane thesis) carries
  its rules in `text`. Both name the class in `class` and the level they are chosen
  at in `level`. The school of unified magical theory sets no `curriculum`.
- An action without an action cost must carry the exploration or downtime
  trait, or set `variable: true`.
- A feat that appears on several classes' feat lists sets `class` to an array
  instead of a single id.
- A class skill choice the book enumerates (e.g. "Trained in your choice of
  Acrobatics or Athletics") is listed in `proficiencies.skills.choices[].from`;
  one that depends on a deity or subclass the dataset cannot enumerate is
  described in `proficiencies.skills.choices[].text`.
- A focus spell may omit `traditions`: its tradition is that of the class
  that granted it, not a property of the spell itself.
- A spell may set `traditionsVary: true` instead of `traditions` when the
  book fixes no tradition because the caster's own choice (a patron, a
  subclass) determines it, e.g. a witch's hexes printed as ordinary cantrips.
- A spell's `trigger`, `requirements` and `cost` are i18n keys, the same as
  an action's.
- A weapon trait printed with a parameter (e.g. "deadly d8", "versatile P")
  lists the base trait in `traits` (`deadly`, `versatile`) and carries the
  parameter in `traitValues`, keyed by that base slug. The parameter is
  normalised to this dataset's own notation rather than the book's: a range
  is a bare number of feet (`thrown` → `"10"`), a damage type is its full
  name (`versatile` → `"piercing"`), a die is `NdM` or `dM` (`fatal` →
  `"1d12"`, `deadly` → `"d10"`), and a parameter that names an item is that
  item's slug (`attached` → `"shield"`). Every trait slug resolves exactly;
  nothing in this dataset may be derived from the structure of an id.
- `text` is optional: a record the book prints as a bare stat line (e.g. Bedroll,
  Chalk) carries no `text` at all rather than an empty one.
- `weapon.damage.dice` may be a plain positive integer (e.g. `"1"`) instead of
  `NdM` for a weapon whose damage is a flat number, not a die roll.
- A background's trained skill may instead be a choice, in the same shape as a
  class's `proficiencies.skills.choices`; a background must grant at least one
  skill through `skills` or through `choices`.

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

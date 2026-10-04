# orc-rules-data

Machine-readable rules of the Pathfinder Second Edition Remaster, published
under the ORC License. Engine-neutral: plain JSON plus JSON Schema, no runtime.

## Layout

- `data/<type>/<id>.json` — one record per file. Types: trait, condition, skill,
  action, feat, feature, ancestry, heritage, background, class, spell, item,
  school, thesis, package, archetype, ability, creature.
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
- An `archetype` lists its feats in `feats` as `{ level, feat }` entries, the
  way a class lists its features: every feat the book prints for it, the
  dedication included, at the level the archetype offers it — the feat's own,
  or the one the book's Additional Feats list gives (Poison Resistance is a
  2nd-level feat the assassin takes at 4th). A feat can belong to several
  archetypes; its own record does not name them. A multiclass archetype names
  its class in `class`, and a member of that class cannot take its dedication
  feat. Every archetype lists exactly one feat with the `dedication` trait, and
  every feat with the `archetype` trait is listed by some archetype.
- A `package` is a Quick Equipment Package: the gear a class starts with. `items`
  lists the base package as `{ item, count }` entries (ammunition is priced per
  ten, so 20 arrows is `count: 2`); `options` lists what the book prints under
  Options — `oneOf` is a choice between `sets` with a `default`, `optional` is one
  purchase, `unresolved` is an option the dataset cannot express (it carries only
  a `note`). Price and money left over are not stored: sum the items' `priceCp`,
  an item without one is free. The printed package price covers `items` only;
  every option costs extra. A `oneOf`'s `default` is the set a "take the
  package" action preselects, and its items are bought on top of the base.
- An action without an action cost must carry the exploration or downtime
  trait, or set `variable: true`.
- A feat that appears on several classes' feat lists sets `class` to an array
  instead of a single id.
- A feat the book lets you select more than once sets `repeatable: true`;
  absent means once.
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
- A `creature` is a stat block as structure. Its numbers are plain fields
  (`level`, `attributes`, `ac`, `saves`, `hp`, `speeds`, `perception`); a
  qualifier the book prints beside a number ("13 when broken", "+2 status to
  all saves vs. magic") is kept as text in that field's `note`, not parsed.
- A creature's `perception.senses` entry is `{ ability }`, `{ own }` or
  `{ text }`; an `{ ability }` sense may carry `text` too, when the stat block
  prints more than the ability's own name ("greater darkvision").
- A creature's size is in `size` and never among its `traits`: the book prints
  it in the trait line, but it has no glossary entry, and the rules compare
  sizes as a scale. The same holds for rarity, which is the envelope's `rarity`.
- `creature.strikes` lists each Strike with its attack `bonus`, its `traits`
  (a parameter such as reach in `traitValues`, a ranged Strike's distance in
  `range` or `rangeIncrement`, its `reload`) and its `damage` parts as
  `{ dice, type }` (`persistent: true` for persistent damage, `splash: true`
  for splash damage). `effects` is what the Strike does besides damage, each
  entry exactly one of `{ ability }` (a universal ability), `{ own }` (one of
  this creature's abilities, by its `id`), `{ text }` or `{ choice }`. An
  `{ ability }` or `{ own }` effect may carry `text` too, when the stat block
  prints more than the ability's own name: "Improved Grab" (one universal
  record covers Improved Grab, Knockdown and Push), "Push 10 feet", or the
  damage printed beside an own ability ("2d6 energy damage (see draconic
  bite)"). A `{ choice }` is an array of two or more of those plain effects
  (never another choice) and means the creature picks one when the Strike hits
  ("Grab or Knockdown"). The book prints a precious
  material among a Strike's traits ("cold iron"); it is not a trait and goes in
  the Strike's `material`, the same slug a weakness or an exception names.
- A creature's `resistances` and `weaknesses` are `{ type, value }` entries.
  When the book prints what bypasses one as a plain list ("except adamantine
  or bludgeoning") it is `except`, an array of slugs (damage types, materials,
  traits); `note` keeps any qualification that is not such a list ("double
  resistance vs. non-magical"). Resistance to all damage is the type
  `all-damage`. When the stat block prints, where a type and a number would go,
  the name of one of the creature's own abilities ("Weaknesses light
  vulnerability"), the entry is `{ own }` — that ability's id, with no value —
  and the ability states the rule.
- `creature.abilities` holds the creature's own abilities in print order, each
  with an `id`, a `name` and a `section` that says where in the stat block it
  stands: `top` (above the first rule), `defense` or `offense`. The header is
  structure — `actions`, `traits`, `aura`, `trigger`, `frequency`,
  `requirements` — and the effect is `text`. An entry that is an instance of a
  universal ability (Trample, or an aura of its own that links the generic
  Aura) says so in `ability`, and keeps the action cost and traits it is
  printed with; its `text` is the creature's own parameters (a DC, a size).
- An `ability` is a universal monster ability — Grab, Darkvision, Trample —
  defined once and pointed at by every creature that has it.
- A creature's `languages` are identifiers, as an ancestry's are; what the book
  prints after them (telepathy, "can't speak any language") is `languageNote`.
- A creature's `spellcasting` lists the stat block's spell blocks in print
  order. A block has a `kind` (`innate`, `prepared`, `spontaneous` or `focus`),
  a `dc` and, when the book prints one, an `attack`. Every kind but `focus` has
  the `tradition` its heading names; a `focus` block ("Cleric Domain Spells 1
  Focus Point") has instead the printed `name` of the block and its
  `focusPoints`, and no tradition. The spells are `cantrips` (`{ rank, spells }`,
  the rank the cantrips are heightened to), `ranks` (an array of `{ rank, spells }`)
  and `constant` (the same, for "Constant (5th)" lines); a block lists at least
  one spell. A spell is `{ spell }`, a reference to a `spell` record, with
  `atWill: true` for "(at will)", `count` for "(×3)" (two or more; no `count`
  means once) and `note` for any other restriction as printed ("self only",
  "animals only"). A spontaneous block's rank may carry `slots`, the "(2
  slots)" the book prints after a rank's last spell; no other block has them.
  Whatever the book prints that is no spell (a ritual, an item) is not here.
- A creature's `perception.senses` entry may also be `{ spell }`: a sense that
  a spell gives the creature (truesight, see the unseen), with the `acuity` and
  `range` the stat block prints.
- A creature's `items` is the stat block's Items line, one entry per carried
  thing in print order. An entry is `{ item }`, a reference to an `item`
  record, or `{ name }` when the dataset has no record for it or the book's
  name for it is not the item's ("baton" for a club); at least one of the two.
  What the line prints around the name is structure: `potency` ("+1"), `runes`
  (`[{ item }]`, the runes in print order; a grade is a record of its own,
  "greater striking" is `item.striking-greater`), `material`
  (the slug a Strike's `material` also uses), `count` ("(4)", "(2 doses)"; two
  or more, absent means one), `ammunition` ("(20 arrows)": `{ item | name,
  count }`), a shield's `hardness`, `hp` and `bt` (all three or none) and
  `note` for any other parenthesis, as printed ("see sidebar"). `potency` and
  `runes` belong to an entry that has `item`.
- A Strike's `item` is the item of the creature's `items` it is made with. The
  validator checks that it is there.
- Creatures in this release are those without rituals; those follow once they
  are modelled. A creature record has no `text` yet: descriptive lore is not
  imported.

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

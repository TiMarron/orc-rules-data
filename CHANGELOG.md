# Changelog

Notable changes to the data and its schema. Versioning is described in the
README: patch for text fixes, minor for new records and optional fields,
major for renamed or removed ids, new required fields and markup changes.

## 0.2.0 — unreleased

### Changed — breaking

- A weapon trait printed with a parameter no longer keeps that parameter in
  its slug. Twenty-seven records — all of them weapons — change: `traits`
  now lists the base trait and the new `traitValues` field carries the
  parameter. The sixteen affected slugs:

  | was | `traits` | `traitValues` |
  |---|---|---|
  | `attached-to-shield` | `attached` | `shield` |
  | `deadly-d6` / `deadly-d8` / `deadly-d10` | `deadly` | `d6` / `d8` / `d10` |
  | `fatal-1d8` / `fatal-1d10` / `fatal-1d12` | `fatal` | `1d8` / `1d10` / `1d12` |
  | `jousting-1d6` | `jousting` | `1d6` |
  | `thrown-10-ft` / `thrown-20-ft` | `thrown` | `10` / `20` |
  | `two-hand-1d10` / `two-hand-1d12` | `two-hand` | `1d10` / `1d12` |
  | `versatile-b` / `versatile-p` / `versatile-s` | `versatile` | `bludgeoning` / `piercing` / `slashing` |
  | `volley-30-ft` | `volley` | `30` |

  None of those sixteen ever had a record. A consumer reading `traits` and
  resolving each slug against `data/traits/` saw thirty-two references that
  pointed at nothing, and could not recover the parameter — which is the
  rule itself: `trait.deadly` states that the weapon adds a damage die "of
  the listed size".

- A feat prerequisite the book prints as a list of alternatives is no longer
  prose. The new `any` kind holds the branches, and a reader that switches on
  `kind` meets a value it has not seen before — the reference reader raises on
  an unknown kind rather than ignoring it, so this is a breaking read.

  ```json
  { "kind": "any", "of": [
    { "kind": "proficiency", "target": "skill.occultism", "rank": "master" },
    { "kind": "proficiency", "target": "skill.religion",  "rank": "master" }
  ] }
  ```

  A branch is itself a prerequisite of any kind, there are always at least two
  of them, and no two are the same. Seven records take this form:
  `feat.break-curse`, `feat.impossible-polymath`, `feat.magical-shorthand`,
  `feat.quick-identification`, `feat.quick-recognition`, `feat.recognize-spell`
  and `feat.trick-magic-item`.

- A proficiency prerequisite's `target` is no longer always a skill id.
  Perception and the saving throws are proficiencies with no record of their
  own — they are not skills — and are now named by the flat keys a character
  sheet keys its proficiencies by: `perception`, and `save.fortitude` /
  `save.reflex` / `save.will`. Five entries use them, in `feat.blind-fight`,
  `feat.expeditious-search`, `feat.legendary-shot` and
  `feat.master-spotter-ranger` (Perception), and `feat.evasiveness-rogue`
  (`save.reflex`). `perception` carries no dot and so is not id-shaped at all;
  code that assumed `target` would always resolve against `data/` was reading
  a coincidence of the corpus, not a rule. Nothing resolves them, and the
  validator does not try to — it checks the spelling against a closed list
  instead. The list grows only when a record needs it: a weapon or armour
  category (`attack.martial`, `defense.light`) and the class DC belong to the
  same namespace, but no prerequisite has asked for one yet.

  Across both changes twelve feat records lose a prose prerequisite, and the
  twelve `feat.<id>.prereq.N` strings behind them leave `i18n/en.json`. Feat
  prerequisites now count 140 text (was 152), 146 proficiency (was 141), 7
  `any` (was 0), and an unchanged 181 feat and 15 attribute.

  What stayed prose, deliberately: `feat.seasoned` names Alcohol Lore and
  Cooking Lore, which have no records of their own (only `skill.lore` does), and
  structuring the two branches that do resolve would state a weaker condition
  than the book prints. Conditions counted over a set ("trained in at least one
  skill", "expert in a skill with the Recall Knowledge action") have no form
  here yet, and conditions that only a built character can answer ("the skill
  associated with your patron's tradition", "your deity's favored weapon") are
  not facts about the record at all.

- The validator no longer resolves a trait slug by shortening it at hyphen
  boundaries until something matches. That heuristic is what let the thirty-two
  dangling references pass. An id in this dataset carries no meaning in its
  structure: slug collisions are resolved by hand, so a later book may mint a
  slug that breaks any such parse.

### Added

- `traitValues`, an optional object on every record's envelope: base trait
  slug → the parameter that trait was printed with, normalised to this
  dataset's notation (feet as a bare number, a damage type as its full name,
  a die as `NdM` or a bare `dM`, an item as its slug). A validator check
  requires every key to be among the record's own `traits`.
- Two record types for a wizard's 1st-level choices, with schemas of their
  own: `school` (`data/schools/`, seven arcane schools) and `thesis`
  (`data/theses/`, five arcane theses), all from Player Core. Both name the
  class in `class` and the level they are chosen at in `level`. A school also
  carries `curriculum` — its cantrips and one spell list per rank — and
  `schoolSpells`, its initial and advanced focus spells; the school of unified
  magical theory has no curriculum and sets none. A reader that enumerates
  the type folders sees two new ones.
- `refSpell` in `common.schema.json`, a reference to a spell record.

### Migrating

Reading `traits` and ignoring `traitValues` is valid and now resolves
everywhere. Code that matched the literal slugs in the table above must read
the base slug and the parameter separately. Rendering the trait line as the
book sets it means composing it from the base trait's name and the value —
`"10"` back to "10 ft.", `"piercing"` back to "P".

Reading a prerequisite by its `kind` must now handle `any` — recursively, since
a branch may itself be one. A reader that cannot evaluate alternatives should
treat the whole entry as unverifiable rather than picking a branch: the record
states that any one of them suffices, and no one of them is the condition.

A `target` is a skill id, `perception`, or `save.fortitude`/`save.reflex`/`save.will`.
Resolving it against `data/skills/` still works for every skill; the other four
spellings have no record and must be matched literally.

A parameter that names an item (`attached` → `"shield"`) is a slug describing
what the weapon attaches to, not a reference to an item record — there is no
`item.shield`. Nothing resolves it, and the validator does not try to.

`traitValues` is a new property, so a reader that rejects unknown properties
rather than ignoring them will fail on the twenty-seven records that carry it
— and, if it loads the corpus eagerly, on the corpus. That is worth knowing
before upgrading: the first consumer to take this release hit exactly that,
and being told beats being skipped. Teach the reader the field, or configure
it to ignore what it does not know.

### Fixed

- Markup the import's upstream source writes in its own notation, which this
  dataset's grammar has no rule for and a reader can only render as literal
  text. Thirty-eight records change.

  - Five references written in that source's `{{type id "label"}}` enricher
    syntax become ordinary `[[id|label]]` references, in `spell.sunburst`,
    `spell.crisis-of-faith`, `spell.goblin-pox` and `spell.mad-monkeys`
    (twice). Each points at the record its label names.
  - Nine records drop a `## …` line left stranded when a table this dataset
    does not carry was omitted: it was that table's caption.
    `action.treat-wounds` and `feat.specialty-crafting` drop the table's `*`
    footnote with it, which qualified a row that is no longer there.
  - `ancestry.human` was publishing its body exactly as the source wrote it —
    `<ul><li>` lists, stray blank lines and all — because one malformed
    heading tag had stopped the conversion. Its lists are now `- ` items and
    its paragraphs read like every other ancestry's.
  - `item.tower-shield` drops a `<sup>2</sup>` marker footnoting an omitted
    table, and gains the `[[action.take-cover|Take Cover]]` reference that the
    same failure had been publishing as a raw link.
  - `feat.initiate-warden`, `feat.advanced-warden`, `feat.masterful-warden`
    and `feat.peerless-warden` drop an absolute link to a search page on the
    source's website. The label stays as plain text: no record here stands for
    "every spell with the warden trait".
  - Seventeen items drop the bare `---` the source prints between an item and
    its variants. This grammar has no horizontal rule, and the blank line
    either side already separates the paragraphs.

  No rules text is added or removed, other than the two table footnotes named
  above. All 6310 strings were swept afterwards, and no markup outside the
  grammar the README documents appears in any of them.

### Also in this release

Three action records — `action.drain-bonded-item`, `action.fire-breath` and
`action.jinx` — gain `edited: true` and an `editNote` they have carried in the
import pipeline since the previous release without the published copies
catching up. Bookkeeping fields only: no rules text, stat or shape changes.

The four spells and three warden feats listed under Fixed move from
`review: "auto"` to `review: "assistant"`, and the five `item.barding` records
carry a reworded `editNote`. Both follow from the fix above being reviewed
rather than automatic; neither touches rules text.

## 0.1.0+2023-first

First import: Player Core, 2212 records and 6310 English strings.

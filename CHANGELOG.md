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

### Migrating

Reading `traits` and ignoring `traitValues` is valid and now resolves
everywhere. Code that matched the literal slugs in the table above must read
the base slug and the parameter separately. Rendering the trait line as the
book sets it means composing it from the base trait's name and the value —
`"10"` back to "10 ft.", `"piercing"` back to "P".

A parameter that names an item (`attached` → `"shield"`) is a slug describing
what the weapon attaches to, not a reference to an item record — there is no
`item.shield`. Nothing resolves it, and the validator does not try to.

### Also in this release

Three action records — `action.drain-bonded-item`, `action.fire-breath` and
`action.jinx` — gain `edited: true` and an `editNote` they have carried in the
import pipeline since the previous release without the published copies
catching up. Bookkeeping fields only: no rules text, stat or shape changes.

## 0.1.0+2023-first

First import: Player Core, 2212 records and 6310 English strings.

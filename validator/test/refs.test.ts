import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { refsCheck } from '../src/checks/refs.js';
import { writeFixture, trait, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

describe('refs check', () => {
  it('passes when traits, id references and [[links]] all resolve', () => {
    const root = writeFixture({
      i18n: { 'feat.x.text': 'See [[trait.flourish|flourish]] {1a}.' },
      records: [
        { folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') },
        { folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { traits: ['flourish'], prerequisites: [{ kind: 'proficiency', target: 'skill.athletics', rank: 'trained' }] }) },
        { folder: 'skills', file: 'skill.athletics.json', json: record('skill', 'athletics') },
      ],
    });
    expect(refsCheck(loadDataset(root))).toEqual([]);
  });

  it('passes a proficiency prerequisite aimed at Perception or a save, which have no record', () => {
    const root = writeFixture({
      records: [
        {
          folder: 'feats',
          file: 'feat.x.json',
          json: record('feat', 'x', {
            prerequisites: [
              { kind: 'proficiency', target: 'perception', rank: 'master' },
              { kind: 'proficiency', target: 'save.reflex', rank: 'expert' },
            ],
          }),
        },
      ],
    });
    expect(refsCheck(loadDataset(root))).toEqual([]);
  });

  it('flags an unknown trait slug', () => {
    const root = writeFixture({ records: [{ folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { traits: ['flourish'] }) }] });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual(['unknown trait "flourish" (no record trait.flourish)']);
  });

  it('flags a parametrized weapon trait slug: only the base trait has a record', () => {
    const root = writeFixture({
      records: [
        { folder: 'traits', file: 'trait.deadly.json', json: trait('deadly') },
        { folder: 'items', file: 'item.x.json', json: record('item', 'x', { traits: ['deadly-d8'] }) },
      ],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'unknown trait "deadly-d8" (no record trait.deadly-d8)',
    ]);
  });

  it('resolves a base trait slug carrying its parameter in traitValues', () => {
    const root = writeFixture({
      records: [
        { folder: 'traits', file: 'trait.deadly.json', json: trait('deadly') },
        { folder: 'items', file: 'item.x.json', json: record('item', 'x', { traits: ['deadly'], traitValues: { deadly: 'd8' } }) },
      ],
    });
    expect(refsCheck(loadDataset(root))).toEqual([]);
  });

  it('flags a traitValues key that the record does not carry as a trait', () => {
    const root = writeFixture({
      records: [
        { folder: 'traits', file: 'trait.deadly.json', json: trait('deadly') },
        { folder: 'traits', file: 'trait.agile.json', json: trait('agile') },
        { folder: 'items', file: 'item.x.json', json: record('item', 'x', { traits: ['agile'], traitValues: { deadly: 'd8' } }) },
      ],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'traitValues: "deadly" is not among this record\'s traits',
    ]);
  });

  it('does not count a nested activation trait as the record carrying it', () => {
    const root = writeFixture({
      records: [
        { folder: 'traits', file: 'trait.deadly.json', json: trait('deadly') },
        { folder: 'items', file: 'item.x.json', json: record('item', 'x', { traits: [], traitValues: { deadly: 'd8' }, activations: [{ actions: '1', traits: ['deadly'] }] }) },
      ],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'traitValues: "deadly" is not among this record\'s traits',
    ]);
  });

  it('flags an id-shaped string that does not resolve, with its path', () => {
    const root = writeFixture({ records: [{ folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { prerequisites: [{ kind: 'feat', id: 'feat.missing' }] }) }] });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual(['prerequisites[0].id: reference "feat.missing" does not resolve']);
  });

  it('flags broken [[links]] and unknown tokens inside i18n strings', () => {
    const root = writeFixture({
      i18n: { 'trait.flourish.text': 'See [[condition.nope]] and {9a}.' },
      records: [{ folder: 'traits', file: 'trait.flourish.json', json: trait('flourish') }],
    });
    const msgs = refsCheck(loadDataset(root)).map((i) => `${i.file}: ${i.message}`);
    expect(msgs).toEqual([
      'i18n/en.json: trait.flourish.text: [[condition.nope]] does not resolve',
      'i18n/en.json: trait.flourish.text: unknown token {9a}',
    ]);
  });

  it('ignores an id-shaped string whose prefix is not a record type', () => {
    const root = writeFixture({ records: [{ folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { usage: 'foo.bar-baz' }) }] });
    expect(refsCheck(loadDataset(root))).toEqual([]);
  });

  it('flags an unknown trait slug in a nested "traits" array, prefixed with its path', () => {
    const root = writeFixture({
      records: [{ folder: 'items', file: 'item.x.json', json: record('item', 'x', { activations: [{ actions: '1', traits: ['no-such-trait'] }] }) }],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'activations[0].traits: unknown trait "no-such-trait" (no record trait.no-such-trait)',
    ]);
  });

  it('flags an unresolved id-shaped string inside an array-valued field, with its indexed path', () => {
    const root = writeFixture({
      records: [{ folder: 'feats', file: 'feat.x.json', json: record('feat', 'x', { category: 'class', class: ['class.missing'], level: 1 }) }],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'class[0]: reference "class.missing" does not resolve',
    ]);
  });

  it('flags a spellcasting tradition that is not among the class\'s own traditions', () => {
    const root = writeFixture({
      records: [
        {
          folder: 'classes',
          file: 'class.x.json',
          json: record('class', 'x', {
            proficiencies: { traditions: ['divine', 'occult'] },
            spellcasting: { tradition: 'arcane' },
          }),
        },
      ],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'spellcasting.tradition: "arcane" is not among class.x\'s proficiencies.traditions ("divine", "occult")',
    ]);
  });

  it('passes a spellcasting tradition that is among the class\'s own traditions', () => {
    const root = writeFixture({
      records: [
        {
          folder: 'classes',
          file: 'class.x.json',
          json: record('class', 'x', {
            proficiencies: { traditions: ['arcane', 'occult'] },
            spellcasting: { tradition: 'arcane' },
          }),
        },
      ],
    });
    expect(refsCheck(loadDataset(root))).toEqual([]);
  });

  it('flags a spellcasting block on a class whose tradition varies', () => {
    const root = writeFixture({
      records: [
        {
          folder: 'classes',
          file: 'class.x.json',
          json: record('class', 'x', {
            proficiencies: { traditionsVary: true },
            spellcasting: { tradition: 'arcane' },
          }),
        },
      ],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      "spellcasting: class.x needs a single tradition of the class's own (proficiencies.traditions)",
    ]);
  });

  it('flags a spellcasting block on a class with no traditions at all', () => {
    const root = writeFixture({
      records: [
        {
          folder: 'classes',
          file: 'class.x.json',
          json: record('class', 'x', {
            proficiencies: {},
            spellcasting: { tradition: 'arcane' },
          }),
        },
      ],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      "spellcasting: class.x needs a single tradition of the class's own (proficiencies.traditions)",
    ]);
  });

  it('resolves skill ids nested inside proficiencies.skills.choices[].from', () => {
    const root = writeFixture({
      records: [
        { folder: 'skills', file: 'skill.acrobatics.json', json: record('skill', 'acrobatics') },
        {
          folder: 'classes',
          file: 'class.x.json',
          json: record('class', 'x', {
            proficiencies: {
              skills: { additional: 3, fixed: [], choices: [{ count: 1, from: ['skill.acrobatics', 'skill.athletics'] }] },
            },
          }),
        },
      ],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'proficiencies.skills.choices[0].from[1]: reference "skill.athletics" does not resolve',
    ]);
  });

  it('flags a one-of package option whose default is past its last set', () => {
    const pkg = record('package', 'fighter', {
      class: 'class.fighter',
      items: [{ item: 'item.dagger', count: 1 }],
      options: [{ kind: 'oneOf', default: 2, sets: [[{ item: 'item.dagger', count: 1 }], [{ item: 'item.dagger', count: 2 }]] }],
    });
    const root = writeFixture({
      records: [
        { folder: 'packages', file: 'package.fighter.json', json: pkg },
        { folder: 'classes', file: 'class.fighter.json', json: record('class', 'fighter') },
        { folder: 'items', file: 'item.dagger.json', json: record('item', 'dagger') },
      ],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'options[0].default: 2 is past the last of 2 sets',
    ]);
  });

  it('flags a package item that does not resolve', () => {
    const pkg = record('package', 'fighter', { class: 'class.fighter', items: [{ item: 'item.dagger', count: 1 }], options: [] });
    const root = writeFixture({
      records: [
        { folder: 'packages', file: 'package.fighter.json', json: pkg },
        { folder: 'classes', file: 'class.fighter.json', json: record('class', 'fighter') },
      ],
    });
    expect(refsCheck(loadDataset(root)).map((i) => i.message)).toEqual([
      'items[0].item: reference "item.dagger" does not resolve',
    ]);
  });

  it('passes a one-of package option whose default is within range', () => {
    const pkg = record('package', 'fighter', {
      class: 'class.fighter',
      items: [{ item: 'item.dagger', count: 1 }],
      options: [{ kind: 'oneOf', default: 1, sets: [[{ item: 'item.dagger', count: 1 }], [{ item: 'item.dagger', count: 2 }]] }],
    });
    const root = writeFixture({
      records: [
        { folder: 'packages', file: 'package.fighter.json', json: pkg },
        { folder: 'classes', file: 'class.fighter.json', json: record('class', 'fighter') },
        { folder: 'items', file: 'item.dagger.json', json: record('item', 'dagger') },
      ],
    });
    expect(refsCheck(loadDataset(root))).toEqual([]);
  });

  it('does not throw on a stray non-object package option, and reports no issue about options', () => {
    const pkg = record('package', 'fighter', {
      class: 'class.fighter',
      items: [{ item: 'item.dagger', count: 1 }],
      options: [null],
    });
    const root = writeFixture({
      records: [
        { folder: 'packages', file: 'package.fighter.json', json: pkg },
        { folder: 'classes', file: 'class.fighter.json', json: record('class', 'fighter') },
        { folder: 'items', file: 'item.dagger.json', json: record('item', 'dagger') },
      ],
    });
    expect(() => refsCheck(loadDataset(root))).not.toThrow();
    const messages = refsCheck(loadDataset(root)).map((i) => i.message);
    expect(messages.some((m) => m.includes('options'))).toBe(false);
  });

  it('resolves the spells of a creature\'s spellcasting and of its senses, and flags one with no record; the array is not a class\'s spellcasting', () => {
    const creature = (spell: string) => record('creature', 'lich', {
      perception: { mod: 20, senses: [{ spell: 'spell.truesight' }] },
      spellcasting: [{ kind: 'innate', tradition: 'divine', dc: 23, ranks: [{ rank: 1, spells: [{ spell }] }] }],
    });
    const records = (spell: string) => [
      { folder: 'creatures', file: 'creature.lich.json', json: creature(spell) },
      { folder: 'spells', file: 'spell.truesight.json', json: record('spell', 'truesight') },
      { folder: 'spells', file: 'spell.heal.json', json: record('spell', 'heal') },
    ];
    expect(refsCheck(loadDataset(writeFixture({ records: records('spell.heal') })))).toEqual([]);
    expect(refsCheck(loadDataset(writeFixture({ records: records('spell.harm') }))).map((i) => i.message)).toEqual([
      'spellcasting[0].ranks[0].spells[0].spell: reference "spell.harm" does not resolve',
    ]);
    const sense = record('creature', 'lich', { perception: { mod: 20, senses: [{ spell: 'spell.gone' }] } });
    expect(refsCheck(loadDataset(writeFixture({ records: [{ folder: 'creatures', file: 'creature.lich.json', json: sense }] }))).map((i) => i.message)).toEqual([
      'perception.senses[0].spell: reference "spell.gone" does not resolve',
    ]);
  });
});

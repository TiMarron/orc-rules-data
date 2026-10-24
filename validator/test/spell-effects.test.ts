import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { spellEffectsCheck } from '../src/checks/spell-effects.js';
import { refsCheck } from '../src/checks/refs.js';
import { writeFixture, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

const spell = (over: Record<string, unknown>) => ({ folder: 'spells', file: 'spell.glow.json', json: record('spell', 'glow', { rank: 1, cast: { actions: '2' }, ...over }) });
type Fixture = ReturnType<typeof spell>;

const messages = (...records: Fixture[]): string[] =>
  spellEffectsCheck(loadDataset(writeFixture({ records }))).map((i) => i.message);

const dmg = { kind: 'damage', dice: '2d6', type: 'fire' };
const frightened = { kind: 'condition', id: 'condition.frightened', value: 1, on: ['failure'] };
const SAVE = { save: 'reflex', basic: true };

describe('spell effects check', () => {
  describe('accepts', () => {
    it('fireball: range, burst, a basic save and damage that heightens by dice', () => {
      const fireball = { whole: true, range: { feet: 500 }, area: { shape: 'burst', feet: 20 }, parts: [{ ...dmg, dice: '6d6', heighten: { every: 1, dice: '2d6' } }] };
      expect(messages(spell({ defense: SAVE, effect: fireball }))).toEqual([]);
    });

    it('fear: a condition the book ends itself, one with a part duration, and a growing target count', () => {
      const fear = {
        whole: false, range: { feet: 30 }, targets: { min: 1, max: 1, heightenMax: { fromRank: 3, max: 5 } },
        parts: [
          { ...frightened, on: ['success'] },
          { kind: 'condition', id: 'condition.fleeing', on: ['criticalFailure'], duration: { rounds: 1 } },
        ],
      };
      expect(messages(spell({ defense: { save: 'will' }, effect: fear }))).toEqual([]);
    });

    it('heal: variants by action count, the block naming the save, heal without degrees', () => {
      const heal = {
        whole: false, defense: { save: 'fortitude', basic: true },
        parts: [{ kind: 'heal', dice: '1d8', heighten: { every: 1, dice: '1d8' } }],
        variants: [
          { actions: 1, range: { touch: true }, targets: { min: 1, max: 1 } },
          { actions: 2, range: { feet: 30 }, targets: { min: 1, max: 1 }, parts: [{ kind: 'heal', dice: '1d8+8' }] },
          { actions: 3, area: { shape: 'emanation', feet: 30 } },
        ],
      };
      expect(messages(spell({ cast: { actions: '1-3' }, effect: heal }))).toEqual([]);
    });

    it('a part that rides the block duration, an attack on success, and a temporary immunity under a save', () => {
      const effect = {
        whole: false, duration: { rounds: 1 }, parts: [
          { kind: 'condition', id: 'condition.blinded', on: ['failure'] },
          { kind: 'temporaryImmunity', minutes: 10 },
        ],
      };
      expect(messages(spell({ defense: { save: 'fortitude' }, effect }))).toEqual([]);
      expect(messages(spell({ defense: 'ac', effect: { whole: true, parts: [{ ...dmg, on: ['success', 'criticalSuccess'] }] } }))).toEqual([]);
    });

    it('a damage type and every type of a choice, from the creature schema (bleed too)', () => {
      const effect = { whole: true, parts: [{ ...dmg, type: 'bleed' }, { kind: 'damage', dice: '1d6', types: ['cold', 'void', 'spirit'] }] };
      expect(messages(spell({ effect }))).toEqual([]);
    });

    it('a block on a heightened entry with a named rank', () => {
      const entry = { level: '4', text: 'spell.glow.heightened.0', effect: { whole: true, parts: [dmg] } };
      expect(messages(spell({ heightened: [entry] }))).toEqual([]);
    });

    it('a spell record without an effect', () => {
      expect(messages(spell({}))).toEqual([]);
    });
  });

  describe('defense', () => {
    it('rejects a defense on both the record and the block', () => {
      expect(messages(spell({ defense: SAVE, effect: { whole: true, defense: { save: 'will' }, parts: [dmg] } }))).toEqual([
        'effect.defense: the record already prints a defense; the block names one only when it does not',
      ]);
    });

    it('rejects a part with degrees when there is no defense anywhere', () => {
      expect(messages(spell({ effect: { whole: true, parts: [dmg, { ...dmg, on: ['failure'] }] } }))).toEqual([
        'effect.parts[1].on: the spell has no defense to roll, so a part has no degrees to apply on',
      ]);
    });

    it('rejects an attack part on failure, naming the degrees', () => {
      const effect = { whole: true, parts: [dmg, { ...dmg, on: ['success', 'failure', 'criticalFailure'] }] };
      expect(messages(spell({ defense: 'ac', effect }))).toEqual([
        "effect.parts[1].on: an attack spell's part acts on success or criticalSuccess, not failure or criticalFailure",
      ]);
    });

    it('takes the defense a block names itself for the attack rule', () => {
      const effect = { whole: true, defense: 'ac', parts: [{ ...dmg, on: ['failure'] }] };
      expect(messages(spell({ effect }))).toEqual([
        "effect.parts[0].on: an attack spell's part acts on success or criticalSuccess, not failure",
      ]);
    });

    it('rejects a part other than damage, heal and temporary immunity that rides a defense without degrees', () => {
      const effect = { whole: true, parts: [{ kind: 'push', feet: 10, direction: 'away' }, { kind: 'condition', id: 'condition.frightened' }] };
      expect(messages(spell({ defense: { save: 'will' }, effect }))).toEqual([
        'effect.parts[0].on: a push part of a spell with a defense must say on which degrees it applies',
        'effect.parts[1].on: a condition part of a spell with a defense must say on which degrees it applies',
      ]);
    });

    it('checks the parts of a variant against the same defense', () => {
      const effect = { whole: true, variants: [{ actions: 1, parts: [{ kind: 'push', feet: 5, direction: 'away' }] }, { actions: 2 }] };
      expect(messages(spell({ cast: { actions: '1-2' }, defense: { save: 'will' }, effect }))).toEqual([
        'effect.variants[0].parts[0].on: a push part of a spell with a defense must say on which degrees it applies',
      ]);
    });
  });

  describe('conditions', () => {
    it('rejects a condition with no ending of its own and no duration, naming the part', () => {
      const effect = { whole: true, parts: [{ kind: 'condition', id: 'condition.blinded' }] };
      expect(messages(spell({ effect }))).toEqual([
        'effect.parts[0].duration: condition.blinded has no ending of its own, so the part or the spell needs a duration',
      ]);
    });

    it('lets every condition with its own ending go without a duration', () => {
      const ids = ['frightened', 'stunned', 'sickened', 'drained', 'doomed', 'prone', 'grabbed', 'restrained', 'unconscious'];
      const parts = ids.map((n) => ({ kind: 'condition', id: `condition.${n}` }));
      expect(messages(spell({ effect: { whole: true, parts } }))).toEqual([]);
    });

    it('leaves the existence of a condition to the refs check, which reads the nested id', () => {
      const effect = { whole: true, parts: [{ kind: 'condition', id: 'condition.frightened' }] };
      const ds = loadDataset(writeFixture({ records: [spell({ effect })] }));
      expect(spellEffectsCheck(ds)).toEqual([]);
      expect(refsCheck(ds).map((i) => i.message)).toContain('effect.parts[0].id: reference "condition.frightened" does not resolve');
    });
  });

  describe('area and range', () => {
    it('rejects a burst without a range', () => {
      expect(messages(spell({ effect: { whole: true, area: { shape: 'burst', feet: 20 }, parts: [dmg] } }))).toEqual([
        'effect.area: a burst is aimed at a point within range, so it needs a range',
      ]);
    });

    it('accepts a cone, a line and an emanation without a range', () => {
      for (const shape of ['cone', 'line', 'emanation']) {
        expect(messages(spell({ effect: { whole: true, area: { shape, feet: 30 }, parts: [dmg] } }))).toEqual([]);
      }
    });

    it('checks the burst of a variant against its own range or the block range', () => {
      const burst = { shape: 'burst', feet: 10 };
      const bare = { whole: true, variants: [{ actions: 1, area: burst }, { actions: 2, area: burst, range: { feet: 30 } }] };
      expect(messages(spell({ cast: { actions: '1-2' }, effect: bare }))).toEqual([
        'effect.variants[0].area: a burst is aimed at a point within range, so it needs a range',
      ]);
      expect(messages(spell({ cast: { actions: '1-2' }, effect: { ...bare, range: { feet: 60 } } }))).toEqual([]);
    });
  });

  describe('targets', () => {
    it('rejects a maximum below the minimum', () => {
      expect(messages(spell({ effect: { whole: true, targets: { min: 2, max: 1 }, parts: [dmg] } }))).toEqual([
        'effect.targets.max: 1 is below the minimum of 2',
      ]);
    });

    it('rejects a heightened maximum that does not exceed the base maximum', () => {
      const targets = { min: 1, max: 3, heightenMax: { fromRank: 3, max: 3 } };
      expect(messages(spell({ effect: { whole: true, targets, parts: [dmg] } }))).toEqual([
        'effect.targets.heightenMax.max: 3 must exceed the base maximum of 3',
      ]);
    });

    it('checks the targets of a variant too', () => {
      const effect = { whole: true, variants: [{ actions: 1, targets: { min: 3, max: 2 } }] };
      expect(messages(spell({ cast: { actions: '1-2' }, effect }))).toEqual(['effect.variants[0].targets.max: 2 is below the minimum of 3']);
    });
  });

  describe('heighten', () => {
    it('rejects a flat step on a part that grows by dice, and dice on one that grows by a step', () => {
      const effect = {
        whole: true, duration: { rounds: 1 }, parts: [
          { ...dmg, heighten: { every: 1, value: 1 } },
          { kind: 'heal', dice: '1d8', heighten: { every: 1, value: 1 } },
          { kind: 'tempHp', dice: '5', heighten: { every: 1, value: 5 } },
          { kind: 'condition', id: 'condition.slowed', heighten: { every: 1, dice: '1d4' } },
          { kind: 'modifier', stat: 'ac', type: 'status', value: 1, heighten: { every: 2, dice: '1d4' } },
          { kind: 'weakness', type: 'fire', value: 5, heighten: { every: 1, dice: '1d4' } },
          { kind: 'resistance', type: 'fire', value: 5, heighten: { every: 1, dice: '1d4' } },
        ],
      };
      expect(messages(spell({ effect }))).toEqual([
        'effect.parts[0].heighten: a damage part grows by dice, not by a flat value',
        'effect.parts[1].heighten: a heal part grows by dice, not by a flat value',
        'effect.parts[2].heighten: a tempHp part grows by dice, not by a flat value',
        'effect.parts[3].heighten: a condition part grows by a flat value, not by dice',
        'effect.parts[4].heighten: a modifier part grows by a flat value, not by dice',
        'effect.parts[5].heighten: a weakness part grows by a flat value, not by dice',
        'effect.parts[6].heighten: a resistance part grows by a flat value, not by dice',
      ]);
    });

    it('rejects any heighten on a push and on a temporary immunity', () => {
      const effect = {
        whole: true, parts: [
          { kind: 'push', feet: 5, direction: 'away', heighten: { every: 1, value: 1 } },
          { kind: 'temporaryImmunity', minutes: 10, heighten: { every: 1, dice: '1d4' } },
        ],
      };
      expect(messages(spell({ effect }))).toEqual([
        'effect.parts[0].heighten: a push part does not heighten',
        'effect.parts[1].heighten: a temporaryImmunity part does not heighten',
      ]);
    });
  });

  describe('heightened entries', () => {
    it('rejects a block on a step (+N), naming the entry', () => {
      const entry = { level: '+1', text: 'spell.glow.heightened.0', effect: { whole: true, parts: [dmg] } };
      expect(messages(spell({ heightened: [entry] }))).toEqual([
        'heightened[0].effect: a block replaces the record\'s from a named rank, but level "+1" is a step above the base rank',
      ]);
    });

    it('checks the block of a heightened entry like the record\'s', () => {
      const entry = { level: '3', text: 'spell.glow.heightened.0', effect: { whole: true, area: { shape: 'burst', feet: 20 }, parts: [dmg] } };
      expect(messages(spell({ heightened: [{ level: '+1', text: 'spell.glow.heightened.1' }, entry] }))).toEqual([
        'heightened[1].effect.area: a burst is aimed at a point within range, so it needs a range',
      ]);
    });
  });

  describe('variants', () => {
    it('rejects variants on a spell that is not cast with a range of actions', () => {
      const effect = { whole: true, variants: [{ actions: 1 }] };
      expect(messages(spell({ cast: { actions: '2' }, effect }))).toEqual([
        'effect.variants: versions by action count need a spell cast with a range of actions (1-2, 1-3 or 2-3), not 2',
      ]);
      expect(messages(spell({ cast: { time: 'spell.glow.cast.time' }, effect }))).toEqual([
        'effect.variants: versions by action count need a spell cast with a range of actions (1-2, 1-3 or 2-3), not no cast.actions',
      ]);
    });

    it('rejects a variant outside the cast range', () => {
      const effect = { whole: true, variants: [{ actions: 1 }, { actions: 2 }, { actions: 3 }] };
      expect(messages(spell({ cast: { actions: '2-3' }, effect }))).toEqual([
        'effect.variants[0].actions: 1 is outside the 2-3 actions the spell is cast with',
      ]);
      expect(messages(spell({ cast: { actions: '1-2' }, effect }))).toEqual([
        'effect.variants[2].actions: 3 is outside the 1-2 actions the spell is cast with',
      ]);
    });

    it('rejects two variants for the same action count', () => {
      const effect = { whole: true, variants: [{ actions: 1 }, { actions: 2 }, { actions: 1 }] };
      expect(messages(spell({ cast: { actions: '1-3' }, effect }))).toEqual(['effect.variants[2].actions: 1 repeats effect.variants[0]']);
    });

    it('checks variants of a heightened block against the record cast', () => {
      const entry = { level: '4', text: 'spell.glow.heightened.0', effect: { whole: true, variants: [{ actions: 3 }] } };
      expect(messages(spell({ cast: { actions: '1-2' }, heightened: [entry] }))).toEqual([
        'heightened[0].effect.variants[0].actions: 3 is outside the 1-2 actions the spell is cast with',
      ]);
    });
  });

  describe('damage types', () => {
    it('rejects a type outside the creature schema list, naming the part', () => {
      const effect = {
        whole: true, duration: { rounds: 1 }, parts: [
          { ...dmg, type: 'plasma' },
          { kind: 'damage', dice: '1d6', types: ['fire', 'light'] },
          { kind: 'weakness', type: 'holy', value: 5 },
          { kind: 'resistance', type: 'sonic', value: 5 },
        ],
      };
      expect(messages(spell({ effect }))).toEqual([
        'effect.parts[0].type: "plasma" is not a damage type',
        'effect.parts[1].types[1]: "light" is not a damage type',
        'effect.parts[2].type: "holy" is not a damage type',
      ]);
    });
  });
});

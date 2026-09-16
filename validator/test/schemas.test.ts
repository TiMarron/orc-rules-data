import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { makeSchemaCheck } from '../src/checks/schema.js';
import { TYPE_FOLDERS } from '../src/types.js';
import { writeFixture, record, SCHEMA_DIR, cleanupFixtures } from './helpers.js';

const check = makeSchemaCheck(SCHEMA_DIR);

const VALID: Record<string, Record<string, unknown>> = {
  trait: record('trait', 'flourish'),
  condition: record('condition', 'frightened', { valued: true }),
  skill: record('skill', 'athletics', { attribute: 'str' }),
  action: record('action', 'stride', { actions: '1' }),
  feat: record('feat', 'sudden-charge', { category: 'class', class: 'class.fighter', level: 1, actions: '2', prerequisites: [] }),
  feature: record('feature', 'reactive-strike', { class: 'class.fighter', level: 1 }),
  ancestry: record('ancestry', 'dwarf', {
    hp: 10, size: 'medium', speed: 20, boosts: ['con', 'wis', 'free'], flaws: ['cha'],
    languages: ['common', 'dwarven'], heritages: ['heritage.ancient-blooded-dwarf'],
  }),
  heritage: record('heritage', 'ancient-blooded-dwarf', { ancestry: 'ancestry.dwarf' }),
  background: record('background', 'warrior', {
    boosts: [['str', 'con'], 'free'], skills: ['skill.intimidation'], lore: 'background.warrior.lore', feat: 'feat.intimidating-glare',
  }),
  class: record('class', 'fighter', {
    keyAttribute: ['str', 'dex'], hp: 10,
    proficiencies: {
      perception: 'expert', fortitude: 'expert', reflex: 'expert', will: 'trained',
      skills: { additional: 3, fixed: [] },
      attacks: { simple: 'expert', martial: 'expert', advanced: 'trained', unarmed: 'expert' },
      defenses: { unarmored: 'trained', light: 'trained', medium: 'trained', heavy: 'trained' },
      classDc: 'trained',
    },
    features: [{ level: 1, feature: 'feature.reactive-strike' }],
    featLevels: { class: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20], skill: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], general: [3, 7, 11, 15, 19], ancestry: [1, 5, 9, 13, 17] },
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    attributeBoostLevels: [5, 10, 15, 20],
  }),
  spell: record('spell', 'heal', {
    rank: 1, traditions: ['divine', 'primal'], cast: { actions: '1-3' },
    range: 'spell.heal.range', targets: 'spell.heal.targets',
    heightened: [{ level: '+1', text: 'spell.heal.heightened.0' }],
  }),
  item: record('item', 'healing-potion', {
    category: 'consumable', level: 1, bulk: 'L', usage: 'item.healing-potion.usage',
    activation: { actions: '1', traits: ['manipulate'] },
    variants: [{ id: 'minor', name: 'item.healing-potion.variant.minor.name', level: 1, priceCp: 400, text: 'item.healing-potion.variant.minor.text' }],
  }),
};

const WEAPON: Record<string, unknown> = record('item', 'longsword', {
  category: 'weapon', level: 0, priceCp: 100, bulk: '1', usage: 'item.longsword.usage',
  weapon: { category: 'martial', group: 'sword', damage: { dice: '1d8', type: 'slashing' }, hands: '1', range: 20, reload: '0' },
});

const ARMOR: Record<string, unknown> = record('item', 'leather-armor', {
  category: 'armor', level: 0, priceCp: 200, bulk: '1', usage: 'item.leather-armor.usage',
  armor: { category: 'light', acBonus: 1, dexCap: 4, checkPenalty: -1, speedPenalty: 0, strength: 0, group: 'leather' },
});

const SHIELD: Record<string, unknown> = record('item', 'steel-shield', {
  category: 'shield', level: 0, priceCp: 200, bulk: '1', usage: 'item.steel-shield.usage',
  shield: { acBonus: 2, hardness: 5, hp: 20, bt: 10 },
});

const SPELL_FULL: Record<string, unknown> = record('spell', 'full-spell', {
  rank: 0, traditions: ['arcane'], focus: false, cast: { actions: '2' },
  range: 'spell.x.range', area: 'spell.x.area', targets: 'spell.x.targets', duration: 'spell.x.duration',
  defense: { save: 'reflex', basic: true },
});

const FEAT_FULL: Record<string, unknown> = record('feat', 'full-feat', {
  category: 'general', level: 1, actions: '1', prerequisites: [],
  trigger: 'feat.full-feat.trigger', requirements: 'feat.full-feat.requirements', frequency: 'feat.full-feat.frequency',
});

const ACTION_FULL: Record<string, unknown> = record('action', 'full-action', {
  actions: '1', trigger: 'action.full-action.trigger', requirements: 'action.full-action.requirements',
});

function issuesFor(type: string, json: Record<string, unknown>) {
  return check(loadDataset(writeFixture({ records: [{ folder: TYPE_FOLDERS[type], file: `${json.id}.json`, json }] }))).map((i) => i.message);
}

afterAll(cleanupFixtures);

describe('type schemas', () => {
  for (const [type, json] of Object.entries(VALID)) {
    it(`accepts a valid ${type}`, () => {
      expect(issuesFor(type, json)).toEqual([]);
    });
  }

  it('accepts a weapon item', () => {
    expect(issuesFor('item', WEAPON)).toEqual([]);
  });

  it('rejects spell rank 11 with exactly one issue', () => {
    const issues = issuesFor('spell', { ...VALID.spell, rank: 11 });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('/rank must be <= 10');
  });

  it('rejects an ancestry speed that is not a multiple of 5 with exactly one issue', () => {
    const issues = issuesFor('ancestry', { ...VALID.ancestry, speed: 22 });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('/speed must be multiple of 5');
  });

  it('rejects a weapon damage die that is not a standard die with exactly one issue', () => {
    const bad = { ...WEAPON, weapon: { ...(WEAPON.weapon as object), damage: { dice: '1d7', type: 'slashing' } } };
    const issues = issuesFor('item', bad);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('/weapon/damage/dice must match pattern');
  });

  it('rejects an unknown property on a class with exactly one issue naming it', () => {
    const issues = issuesFor('class', { ...VALID.class, bogus: 1 });
    expect(issues).toEqual(['schema: / must NOT have unevaluated properties (bogus)']);
  });

  it('rejects a class feature entry missing its level', () => {
    const issues = issuesFor('class', { ...VALID.class, features: [{ feature: 'feature.reactive-strike' }] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("/features/0 must have required property 'level'");
  });

  it('accepts an armor item', () => {
    expect(issuesFor('item', ARMOR)).toEqual([]);
  });

  it('accepts an armor item with a null dexCap', () => {
    const withNullDexCap = { ...ARMOR, armor: { ...(ARMOR.armor as object), dexCap: null } };
    expect(issuesFor('item', withNullDexCap)).toEqual([]);
  });

  it('accepts a shield item', () => {
    expect(issuesFor('item', SHIELD)).toEqual([]);
  });

  it('accepts a spell with all optional fields set', () => {
    expect(issuesFor('spell', SPELL_FULL)).toEqual([]);
  });

  it('accepts a spell with defense "ac"', () => {
    expect(issuesFor('spell', { ...SPELL_FULL, defense: 'ac' })).toEqual([]);
  });

  it('accepts a spell cast by time instead of actions', () => {
    expect(issuesFor('spell', { ...SPELL_FULL, cast: { time: 'spell.x.cast-time' } })).toEqual([]);
  });

  it('accepts a feat with trigger, requirements, and frequency', () => {
    expect(issuesFor('feat', FEAT_FULL)).toEqual([]);
  });

  it('accepts an action with trigger and requirements', () => {
    expect(issuesFor('action', ACTION_FULL)).toEqual([]);
  });

  it('accepts a class with spellcasting proficiency', () => {
    const withSpellcasting = {
      ...VALID.class,
      proficiencies: { ...(VALID.class.proficiencies as object), spellcasting: 'trained' },
    };
    expect(issuesFor('class', withSpellcasting)).toEqual([]);
  });

  it('rejects an ancestry boost that is a single-attribute array with exactly 3 issues', () => {
    const issues = issuesFor('ancestry', { ...VALID.ancestry, boosts: [['str']] });
    expect(issues).toHaveLength(3);
    expect(issues.some((m) => m.includes('must match exactly one schema in oneOf'))).toBe(true);
  });

  it('rejects an empty class keyAttribute with exactly 3 issues', () => {
    const issues = issuesFor('class', { ...VALID.class, keyAttribute: [] });
    expect(issues).toHaveLength(3);
  });

  it('rejects an empty spell traditions list with exactly one issue', () => {
    const issues = issuesFor('spell', { ...VALID.spell, traditions: [] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('must NOT have fewer than 1 items');
  });

  it('rejects a heightened level that does not match the pattern with exactly one issue', () => {
    const issues = issuesFor('spell', {
      ...VALID.spell,
      heightened: [{ level: '0', text: 'spell.heal.heightened.0' }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('/heightened/0/level must match pattern');
  });

  it('rejects an empty background skills list with exactly one issue', () => {
    const issues = issuesFor('background', { ...VALID.background, skills: [] });
    expect(issues).toHaveLength(1);
  });

  it('accepts an action with no "actions"', () => {
    expect(issuesFor('action', record('action', 'no-cost'))).toEqual([]);
  });

  it('accepts an action with variable: true', () => {
    expect(issuesFor('action', record('action', 'variable-cost', { variable: true }))).toEqual([]);
  });

  it('rejects an action with a non-boolean "variable" with exactly one issue', () => {
    const issues = issuesFor('action', record('action', 'bad-variable', { variable: 'yes' }));
    expect(issues).toHaveLength(1);
  });

  it('accepts a class feat whose "class" is an array of several classes', () => {
    expect(
      issuesFor('feat', record('feat', 'shared', { category: 'class', class: ['class.bard', 'class.cleric'], level: 1 })),
    ).toEqual([]);
  });

  it('rejects a class feat whose "class" is an empty array', () => {
    // Mirrors the empty-keyAttribute case above: ajv's oneOf reports the failed string
    // branch, the failed array branch (minItems), and the oneOf combinator itself.
    const issues = issuesFor('feat', record('feat', 'no-class', { category: 'class', class: [], level: 1 }));
    expect(issues).toHaveLength(3);
  });

  it('accepts an ancestry feat whose "ancestry" is an array of several ancestries', () => {
    expect(
      issuesFor('feat', record('feat', 'shared-ancestry', { category: 'ancestry', ancestry: ['ancestry.elf', 'ancestry.human'], level: 1 })),
    ).toEqual([]);
  });
});

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
  school: record('school', 'school-of-mentalism', {
    class: 'class.wizard', level: 1,
    curriculum: { cantrips: ['spell.daze'], ranks: { 1: ['spell.sleep'] } },
    schoolSpells: { initial: 'spell.charming-push', advanced: 'spell.invisibility-cloak' },
  }),
  thesis: record('thesis', 'spell-blending', { class: 'class.wizard', level: 1 }),
  archetype: record('archetype', 'fighter', {
    class: 'class.fighter',
    feats: [{ level: 2, feat: 'feat.fighter-dedication' }, { level: 4, feat: 'feat.basic-maneuver' }],
  }),
  ability: record('ability', 'grab', { actions: '1', requirements: 'ability.grab.requirements' }),
  creature: record('creature', 'cave-bear', {
    traits: ['animal'], level: 6, size: 'large',
    perception: { mod: 13, senses: [{ ability: 'ability.low-light-vision' }, { ability: 'ability.scent', acuity: 'imprecise', range: 30 }] },
    languages: [],
    skills: [{ skill: 'skill.athletics', mod: 16 }, { lore: 'creature.cave-bear.lore.1', mod: 11 }],
    attributes: { str: 6, dex: 1, con: 6, int: -4, wis: 1, cha: -1 },
    ac: { value: 24 }, saves: { fortitude: 16, reflex: 11, will: 13 }, hp: { value: 95, note: 'creature.cave-bear.hp.note' },
    weaknesses: [{ type: 'fire', value: 5 }],
    speeds: { land: 35 },
    strikes: [{
      kind: 'melee', name: 'creature.cave-bear.strikes.claw.name', actions: '1', bonus: 16, traits: ['agile', 'reach'], traitValues: { reach: '10' },
      damage: [{ dice: '2d8+6', type: 'slashing' }, { dice: '1d6', type: 'bleed', persistent: true }],
      effects: [{ ability: 'ability.grab' }, { own: 'mauler' }, { ability: 'ability.improved-grab', text: 'creature.cave-bear.strikes.claw.effects.2' }],
    }],
    abilities: [
      { id: 'mauler', section: 'offense', name: 'creature.cave-bear.abilities.mauler.name', text: 'creature.cave-bear.abilities.mauler.text' },
      { id: 'rush', section: 'offense', name: 'creature.cave-bear.abilities.rush.name', actions: '2', traits: ['aura'], aura: 20, text: 'creature.cave-bear.abilities.rush.text' },
      { id: 'trample', section: 'offense', name: 'creature.cave-bear.abilities.trample.name', ability: 'ability.trample', actions: '3', text: 'creature.cave-bear.abilities.trample.text' },
    ],
  }),
  package: record('package', 'fighter', {
    class: 'class.fighter',
    items: [{ item: 'item.scale-mail', count: 1 }, { item: 'item.arrows', count: 2 }],
    options: [
      {
        kind: 'oneOf',
        default: 0,
        sets: [[{ item: 'item.greatsword', count: 1 }], [{ item: 'item.longsword', count: 1 }, { item: 'item.steel-shield', count: 1 }]],
      },
      { kind: 'optional', sets: [[{ item: 'item.healers-toolkit', count: 1 }]] },
      { kind: 'unresolved', note: 'package.fighter.options.2.note' },
    ],
  }),
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
    activations: [{ actions: '1', traits: ['manipulate'], text: 'item.healing-potion.activations.0.text' }],
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
  trigger: 'spell.full-spell.trigger', requirements: 'spell.full-spell.requirements', cost: 'spell.full-spell.cost',
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

  it('accepts a flat integer weapon damage with no die', () => {
    const flat = { ...WEAPON, weapon: { ...(WEAPON.weapon as object), damage: { dice: '1', type: 'piercing' } } };
    expect(issuesFor('item', flat)).toEqual([]);
  });

  it('rejects a weapon damage dice value that is neither a die nor a flat integer with exactly one issue', () => {
    const bad = { ...WEAPON, weapon: { ...(WEAPON.weapon as object), damage: { dice: '0', type: 'piercing' } } };
    const issues = issuesFor('item', bad);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('/weapon/damage/dice must match pattern');
  });

  it('accepts an envelope with no "text"', () => {
    expect(issuesFor('trait', { ...VALID.trait, text: undefined })).toEqual([]);
  });

  it('accepts an envelope carrying a trait parameter', () => {
    expect(issuesFor('item', { ...WEAPON, traits: ['deadly'], traitValues: { deadly: 'd10' } })).toEqual([]);
  });

  it('accepts two trait parameters on one record, as a lance carries deadly and jousting', () => {
    expect(issuesFor('item', { ...WEAPON, traits: ['deadly', 'jousting'], traitValues: { deadly: 'd8', jousting: '1d6' } })).toEqual([]);
  });

  it('rejects a traitValues key that is not a slug', () => {
    const issues = issuesFor('item', { ...WEAPON, traits: ['deadly'], traitValues: { 'Deadly d10': 'd10' } });
    // ajv reports the propertyNames subschema's own pattern failure, plus the
    // "property name must be valid" error that wraps it — two issues for one cause.
    expect(issues).toHaveLength(2);
    expect(issues.some((m) => m.includes('/traitValues must match pattern'))).toBe(true);
    expect(issues.some((m) => m.includes('property name must be valid'))).toBe(true);
  });

  it('rejects an empty traitValues value', () => {
    const issues = issuesFor('item', { ...WEAPON, traits: ['deadly'], traitValues: { deadly: '' } });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/must NOT have fewer than 1 characters/);
  });

  it('rejects an empty traitValues object', () => {
    const issues = issuesFor('item', { ...WEAPON, traitValues: {} });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/must NOT have fewer than 1 properties/);
  });

  it('rejects an envelope with an empty "text" value with exactly one issue', () => {
    const issues = issuesFor('trait', { ...VALID.trait, text: '' });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/\/text must match pattern/);
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

  it('rejects a spell whose "cost" is not an i18n key with exactly one issue', () => {
    const issues = issuesFor('spell', { ...SPELL_FULL, cost: 'not an i18n key' });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('/cost must match pattern');
  });

  it('accepts a school without a curriculum (unified magical theory)', () => {
    const school = record('school', 'school-of-unified-magical-theory', {
      class: 'class.wizard', level: 1,
      schoolSpells: { initial: 'spell.hand-of-the-apprentice', advanced: 'spell.interdisciplinary-incantation' },
    });
    expect(issuesFor('school', school)).toEqual([]);
  });

  it('rejects a curriculum rank key outside 1..10', () => {
    const school = record('school', 'school-of-mentalism', {
      class: 'class.wizard', level: 1,
      curriculum: { cantrips: ['spell.daze'], ranks: { 11: ['spell.sleep'] } },
    });
    const issues = issuesFor('school', school);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(String.fromCharCode(10))).toContain('ranks');
  });

  it('rejects school spells without the initial one with exactly one issue', () => {
    const school = record('school', 'school-of-mentalism', {
      class: 'class.wizard', level: 1,
      schoolSpells: { advanced: 'spell.invisibility-cloak' },
    });
    const issues = issuesFor('school', school);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("must have required property 'initial'");
  });

  it('rejects an archetype with no feats', () => {
    const issues = issuesFor('archetype', { ...VALID.archetype, feats: [] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('/feats must NOT have fewer than 1 items');
  });

  it('rejects an archetype feat entry without a level', () => {
    const issues = issuesFor('archetype', { ...VALID.archetype, feats: [{ feat: 'feat.fighter-dedication' }] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("must have required property 'level'");
  });

  it('rejects an unknown property on a thesis with exactly one issue naming it', () => {
    const thesis = record('thesis', 'spell-blending', { class: 'class.wizard', level: 1, curriculum: {} });
    const issues = issuesFor('thesis', thesis);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('curriculum');
  });

  const PACKAGE = VALID.package;

  it('rejects a one-of package option with a single set', () => {
    const options = [{ kind: 'oneOf', default: 0, sets: [[{ item: 'item.greatsword', count: 1 }]] }];
    const issues = issuesFor('package', { ...PACKAGE, options });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('must NOT have fewer than 2 items');
  });

  it('rejects an optional package purchase with two sets', () => {
    const options = [{ kind: 'optional', sets: [[{ item: 'item.dagger', count: 1 }], [{ item: 'item.sickle', count: 1 }]] }];
    const issues = issuesFor('package', { ...PACKAGE, options });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('must NOT have more than 1 items');
  });

  it('rejects a package item count of zero', () => {
    const issues = issuesFor('package', { ...PACKAGE, items: [{ item: 'item.dagger', count: 0 }] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('must be >= 1');
  });

  it('rejects an unresolved package option without a note', () => {
    const issues = issuesFor('package', { ...PACKAGE, options: [{ kind: 'unresolved' }] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("must have required property 'note'");
  });

  it('rejects a package without items', () => {
    const issues = issuesFor('package', { ...PACKAGE, items: [] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('must NOT have fewer than 1 items');
  });

  it('rejects a package option with an unknown kind, naming the discriminator problem', () => {
    const options = [{ kind: 'oneof', default: 0, sets: [[{ item: 'item.dagger', count: 1 }]] }];
    const issues = issuesFor('package', { ...PACKAGE, options });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('kind');
  });

  const SLOTS_20 = Array.from({ length: 20 }, (_, i) => ({
    cantrips: 5,
    ranks: i === 0 ? { 1: 2 } : { 1: 3 },
  }));
  const WIZARD_CASTING = {
    kind: 'prepared',
    source: 'spellbook',
    tradition: 'arcane',
    slots: SLOTS_20,
    spellbook: { initialCantrips: 10, initialSpells: 5, perLevel: 2 },
    curriculum: { cantrips: 1, initialSpells: 2, perNewRank: 1, extraCantripSlot: 1, extraSlotPerRank: 1 },
  };

  it('accepts a class with a spellcasting block', () => {
    expect(issuesFor('class', { ...VALID.class, spellcasting: WIZARD_CASTING })).toEqual([]);
  });

  it('accepts a spellcasting block without spellbook and curriculum (a class that prepares from its list)', () => {
    const { spellbook, curriculum, ...rest } = WIZARD_CASTING;
    expect(issuesFor('class', { ...VALID.class, spellcasting: { ...rest, source: 'list' } })).toEqual([]);
  });

  it('rejects a slot table that is not exactly twenty rows', () => {
    const issues = issuesFor('class', { ...VALID.class, spellcasting: { ...WIZARD_CASTING, slots: SLOTS_20.slice(0, 19) } });
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(String.fromCharCode(10))).toContain('slots');
  });

  it('rejects a slot rank key outside 1..10', () => {
    const slots = SLOTS_20.map((row, i) => (i === 0 ? { cantrips: 5, ranks: { 11: 1 } } : row));
    const issues = issuesFor('class', { ...VALID.class, spellcasting: { ...WIZARD_CASTING, slots } });
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(String.fromCharCode(10))).toContain('ranks');
  });

  it('rejects an unknown kind', () => {
    const issues = issuesFor('class', { ...VALID.class, spellcasting: { ...WIZARD_CASTING, kind: 'innate' } });
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(String.fromCharCode(10))).toContain('kind');
  });

  it('rejects source spellbook without a spellbook block', () => {
    const { spellbook, curriculum, ...rest } = WIZARD_CASTING;
    const issues = issuesFor('class', { ...VALID.class, spellcasting: rest });
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(String.fromCharCode(10))).toContain('spellbook');
  });

  it('rejects a curriculum without a spellbook block (source list)', () => {
    const { spellbook, ...rest } = WIZARD_CASTING;
    const issues = issuesFor('class', { ...VALID.class, spellcasting: { ...rest, source: 'list' } });
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(String.fromCharCode(10))).toContain('spellbook');
  });

  it('rejects a slot table that is not exactly twenty rows (twenty-one)', () => {
    const slots = [...SLOTS_20, { cantrips: 5, ranks: { 1: 3 } }];
    const issues = issuesFor('class', { ...VALID.class, spellcasting: { ...WIZARD_CASTING, slots } });
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(String.fromCharCode(10))).toContain('slots');
  });

  it('rejects a rank value of 0', () => {
    const slots = SLOTS_20.map((row, i) => (i === 0 ? { cantrips: 5, ranks: { 1: 0 } } : row));
    const issues = issuesFor('class', { ...VALID.class, spellcasting: { ...WIZARD_CASTING, slots } });
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(String.fromCharCode(10))).toContain('ranks');
  });

  it('rejects a spellbook block when source is not spellbook', () => {
    const { curriculum, ...rest } = WIZARD_CASTING;
    const issues = issuesFor('class', { ...VALID.class, spellcasting: { ...rest, source: 'list' } });
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(String.fromCharCode(10))).toContain('spellbook');
  });

  it('rejects source repertoire (its table does not exist yet)', () => {
    const issues = issuesFor('class', { ...VALID.class, spellcasting: { ...WIZARD_CASTING, source: 'repertoire' } });
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join(String.fromCharCode(10))).toContain('source');
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

  it('accepts a class skills.choices with an enumerated choice', () => {
    const withChoice = {
      ...VALID.class,
      proficiencies: {
        ...(VALID.class.proficiencies as object),
        skills: { additional: 3, fixed: [], choices: [{ count: 1, from: ['skill.acrobatics', 'skill.athletics'] }] },
      },
    };
    expect(issuesFor('class', withChoice)).toEqual([]);
  });

  it('accepts a class skills.choices with a described choice', () => {
    const withChoice = {
      ...VALID.class,
      proficiencies: {
        ...(VALID.class.proficiencies as object),
        skills: { additional: 3, fixed: [], choices: [{ count: 1, text: 'class.cleric.skill-choice.0' }] },
      },
    };
    expect(issuesFor('class', withChoice)).toEqual([]);
  });

  it('accepts a class skills.choices with both an enumerated and a described choice', () => {
    const withBoth = {
      ...VALID.class,
      proficiencies: {
        ...(VALID.class.proficiencies as object),
        skills: {
          additional: 3,
          fixed: [],
          choices: [
            { count: 1, from: ['skill.acrobatics', 'skill.athletics'] },
            { count: 1, text: 'class.rogue.skill-choice.0' },
          ],
        },
      },
    };
    expect(issuesFor('class', withBoth)).toEqual([]);
  });

  it('rejects a skill choice with neither "from" nor "text"', () => {
    const bad = {
      ...VALID.class,
      proficiencies: {
        ...(VALID.class.proficiencies as object),
        skills: { additional: 3, fixed: [], choices: [{ count: 1 }] },
      },
    };
    const issues = issuesFor('class', bad);
    // Mirrors the empty-keyAttribute case above: ajv's oneOf reports the failed
    // enumerated branch, the failed described branch, and the oneOf combinator.
    expect(issues).toHaveLength(3);
  });

  it('rejects a skill choice whose "from" has only one entry', () => {
    const bad = {
      ...VALID.class,
      proficiencies: {
        ...(VALID.class.proficiencies as object),
        skills: { additional: 3, fixed: [], choices: [{ count: 1, from: ['skill.acrobatics'] }] },
      },
    };
    const issues = issuesFor('class', bad);
    // ajv reports: the enumerated branch's minItems failure, the described
    // branch's missing "text" (since "from" isn't one of its properties), the
    // described branch's "additional properties" complaint about "from", and
    // the oneOf combinator itself.
    expect(issues).toHaveLength(4);
  });

  it('rejects a skill choice with an unknown property', () => {
    const bad = {
      ...VALID.class,
      proficiencies: {
        ...(VALID.class.proficiencies as object),
        skills: {
          additional: 3,
          fixed: [],
          choices: [{ count: 1, from: ['skill.acrobatics', 'skill.athletics'], bogus: true }],
        },
      },
    };
    const issues = issuesFor('class', bad);
    // The enumerated branch rejects "bogus" as an additional property; the described
    // branch rejects both "from" and "bogus" as additional properties and separately
    // wants "text"; the oneOf combinator itself makes five.
    expect(issues).toHaveLength(5);
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

  it('rejects a background skills list with more than one entry with exactly one issue', () => {
    const issues = issuesFor('background', { ...VALID.background, skills: ['skill.intimidation', 'skill.deception'] });
    expect(issues).toHaveLength(1);
  });

  it('accepts an empty background skills list when choices supply a skill', () => {
    const withChoice = { ...VALID.background, skills: [], choices: [{ count: 1, from: ['skill.arcana', 'skill.nature', 'skill.occultism', 'skill.religion'] }] };
    expect(issuesFor('background', withChoice)).toEqual([]);
  });

  it('accepts a background skills.choices with a described choice', () => {
    const withChoice = { ...VALID.background, skills: [], choices: [{ text: 'background.raised-by-belief.skill-choice.0' }] };
    expect(issuesFor('background', withChoice)).toEqual([]);
  });

  it('accepts a background with empty skills and no choices at the schema level', () => {
    // The "must grant at least one skill" invariant is a cross-field rule enforced by
    // flagsCheck (see flags.test.ts), not JSON Schema — mirrors the class/ancestry pattern.
    expect(issuesFor('background', { ...VALID.background, skills: [] })).toEqual([]);
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

  it('accepts an ancestry feat with versatile: true and no "ancestry"', () => {
    expect(
      issuesFor('feat', record('feat', 'versatile-feat', { category: 'ancestry', versatile: true, level: 1 })),
    ).toEqual([]);
  });

  it('rejects a feat whose "versatile" is not a boolean with exactly one issue', () => {
    const issues = issuesFor('feat', record('feat', 'bad-versatile', { category: 'ancestry', versatile: 'yes', level: 1 }));
    expect(issues).toHaveLength(1);
  });

  it('accepts a spell with traditionsVary: true and no traditions', () => {
    expect(issuesFor('spell', { ...SPELL_FULL, traditions: undefined, traditionsVary: true })).toEqual([]);
  });

  it('rejects a spell whose "traditionsVary" is not a boolean with exactly one issue', () => {
    const issues = issuesFor('spell', { ...SPELL_FULL, traditionsVary: 'yes' });
    expect(issues).toHaveLength(1);
  });
  it('accepts a proficiency prerequisite targeting Perception', () => {
    const prereq = { kind: 'proficiency', target: 'perception', rank: 'master' };
    expect(issuesFor('feat', record('feat', 'blind-fight', { category: 'general', level: 1, prerequisites: [prereq] }))).toEqual([]);
  });

  it('accepts a proficiency prerequisite targeting a saving throw', () => {
    const prereq = { kind: 'proficiency', target: 'save.reflex', rank: 'expert' };
    expect(issuesFor('feat', record('feat', 'evasiveness', { category: 'class', class: 'class.rogue', level: 1, prerequisites: [prereq] }))).toEqual([]);
  });

  it('rejects a saving-throw target written without its namespace', () => {
    const prereq = { kind: 'proficiency', target: 'reflex', rank: 'expert' };
    const issues = issuesFor('feat', record('feat', 'bare-save', { category: 'general', level: 1, prerequisites: [prereq] }));
    expect(issues.join(' | ')).toContain('/prerequisites/0');
  });

  it('accepts an "any" prerequisite over two skill proficiencies', () => {
    const prereq = {
      kind: 'any',
      of: [
        { kind: 'proficiency', target: 'skill.occultism', rank: 'master' },
        { kind: 'proficiency', target: 'skill.religion', rank: 'master' },
      ],
    };
    expect(issuesFor('feat', record('feat', 'break-curse', { category: 'general', level: 1, prerequisites: [prereq] }))).toEqual([]);
  });

  it('rejects an "any" prerequisite with a single branch', () => {
    const prereq = { kind: 'any', of: [{ kind: 'proficiency', target: 'skill.occultism', rank: 'master' }] };
    const issues = issuesFor('feat', record('feat', 'lonely-any', { category: 'general', level: 1, prerequisites: [prereq] }));
    expect(issues.join(' | ')).toContain('must NOT have fewer than 2 items');
  });

  it('rejects an "any" prerequisite repeating the same branch', () => {
    const branch = { kind: 'proficiency', target: 'skill.occultism', rank: 'master' };
    const issues = issuesFor('feat', record('feat', 'doubled-any', { category: 'general', level: 1, prerequisites: [{ kind: 'any', of: [branch, branch] }] }));
    expect(issues.join(' | ')).toContain('must NOT have duplicate items');
  });

  it('accepts a feat marked repeatable', () => {
    expect(issuesFor('feat', { ...VALID.feat, repeatable: true })).toEqual([]);
  });

  it('rejects a repeatable flag that is not a boolean', () => {
    const issues = issuesFor('feat', { ...VALID.feat, repeatable: 'yes' });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('repeatable');
  });

  it('rejects a strike effect that names two things at once', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].effects = [{ ability: 'ability.grab', own: 'mauler' }];
    const issues = issuesFor('creature', c);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.join('\n')).toContain('/strikes/0/effects/0');
  });

  it('rejects an ability entry that only points at a universal ability, without an id and a name of its own', () => {
    const c = structuredClone(VALID.creature) as any;
    c.abilities[2] = { ability: 'ability.trample', section: 'offense', text: 'creature.cave-bear.abilities.trample.text' };
    const issues = issuesFor('creature', c).join('\n');
    expect(issues).toContain('/abilities/2');
    expect(issues).toContain("must have required property 'id'");
  });

  it('rejects text on a Strike effect that names one of the creature\'s own abilities', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].effects = [{ own: 'mauler', text: 'creature.cave-bear.strikes.claw.effects.0' }];
    expect(issuesFor('creature', c).join('\n')).toContain('/strikes/0/effects/0');
  });

  it('accepts a Strike\'s reload, and rejects one that is not a small whole number', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes.push({ kind: 'ranged', name: 'creature.cave-bear.strikes.crossbow.name', actions: '1', bonus: 12, traits: [], rangeIncrement: 120, reload: 1, damage: [{ dice: '1d8', type: 'piercing' }] });
    expect(issuesFor('creature', c)).toEqual([]);
    for (const reload of [4, -1, '1', 1.5]) {
      c.strikes[1].reload = reload;
      expect(issuesFor('creature', c).join('\n')).toContain('/strikes/1/reload');
    }
  });

  it('accepts the precious material a Strike counts as, and rejects one that is not a slug', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].material = 'cold-iron';
    expect(issuesFor('creature', c)).toEqual([]);
    for (const material of ['Cold Iron', 'cold iron', '', 5]) {
      c.strikes[0].material = material;
      expect(issuesFor('creature', c).join('\n')).toContain('/strikes/0/material');
    }
  });

  it('accepts what bypasses a resistance or a weakness in `except`, and rejects an empty list, a repeat and a non-slug', () => {
    const c = structuredClone(VALID.creature) as any;
    c.resistances = [{ type: 'physical', value: 10, except: ['adamantine'] }, { type: 'all-damage', value: 5, except: ['force', 'ghost-touch', 'spirit', 'vitality'], note: 'creature.cave-bear.resistances.1.note' }];
    c.weaknesses = [{ type: 'fire', value: 5, except: ['cold-iron'] }];
    expect(issuesFor('creature', c)).toEqual([]);
    for (const except of [[], ['silver', 'silver'], ['Silver'], 'silver']) {
      c.resistances[0].except = except;
      expect(issuesFor('creature', c).join('\n')).toContain('/resistances/0/except');
    }
  });

  it('accepts a weakness or a resistance that names one of the creature\'s own abilities, and rejects one that also carries a value', () => {
    const c = structuredClone(VALID.creature) as any;
    c.weaknesses = [{ type: 'fire', value: 5 }, { own: 'light-vulnerability' }];
    c.resistances = [{ own: 'divine-revulsion' }];
    expect(issuesFor('creature', c)).toEqual([]);
    c.weaknesses = [{ own: 'light-vulnerability', value: 5 }];
    expect(issuesFor('creature', c).join('\n')).toContain('/weaknesses/0');
    c.weaknesses = [{ own: 'Light Vulnerability' }];
    expect(issuesFor('creature', c).join('\n')).toContain('/weaknesses/0');
    c.weaknesses = [{ own: 'light-vulnerability', type: 'light' }];
    expect(issuesFor('creature', c).join('\n')).toContain('/weaknesses/0');
  });

  it('accepts text on a sense that is a universal ability, for what the stat block prints beyond its name (greater darkvision)', () => {
    const c = structuredClone(VALID.creature) as any;
    c.perception.senses = [{ ability: 'ability.darkvision', text: 'creature.cave-bear.senses.0' }];
    expect(issuesFor('creature', c)).toEqual([]);
    c.perception.senses = [{ own: 'web-sense', text: 'creature.cave-bear.senses.0' }];
    expect(issuesFor('creature', c).join('\n')).toContain('/perception/senses/0');
  });

  it('rejects damage dice that are not NdM, NdM±K or a flat number', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].damage = [{ dice: 'lots', type: 'slashing' }];
    expect(issuesFor('creature', c).join('\n')).toContain('/strikes/0/damage/0/dice');
  });

  it('rejects speeds that carry a note but no speed', () => {
    const c = structuredClone(VALID.creature) as any;
    c.speeds = { note: 'creature.cave-bear.speeds.note' };
    expect(issuesFor('creature', c).length).toBeGreaterThanOrEqual(1);
  });

  it('accepts speeds with a single speed that is not land', () => {
    const c = structuredClone(VALID.creature) as any;
    c.speeds = { fly: 40 };
    expect(issuesFor('creature', c)).toEqual([]);
  });

  it('rejects a creature missing one of the six attributes', () => {
    const c = structuredClone(VALID.creature) as any;
    delete c.attributes.cha;
    expect(issuesFor('creature', c).join('\n')).toContain("must have required property 'cha'");
  });

  it('rejects an ability record without text', () => {
    const { text: _, ...rest } = VALID.ability as Record<string, unknown>;
    expect(issuesFor('ability', rest).join('\n')).toContain("must have required property 'text'");
  });
});

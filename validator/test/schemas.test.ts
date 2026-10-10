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
  ritual: record('ritual', 'geas', {
    rank: 3, cast: 'ritual.geas.cast',
    primaryCheck: [{ skill: 'skill.occultism', rank: 'master' }, { skill: 'skill.religion', rank: 'master' }],
    secondaryChecks: [{ skill: 'skill.diplomacy' }, { oneOf: [{ skill: 'skill.arcana' }, { lore: 'ritual.geas.secondary-checks.1.1.lore' }] }],
    range: 'ritual.geas.range', targets: 'ritual.geas.targets', duration: 'ritual.geas.duration',
    heightened: [{ level: '+1', text: 'ritual.geas.heightened.0' }],
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
  affliction: record('affliction', 'scarlet-leprosy', {
    kind: 'disease', level: 4, save: { type: 'fortitude', dc: 19 },
    onset: { amount: 1, unit: 'day' },
    stages: [
      { text: 'affliction.scarlet-leprosy.stages.0', duration: { amount: 1, unit: 'day' } },
      { text: 'affliction.scarlet-leprosy.stages.1' },
    ],
  }),
  hazard: record('hazard', 'scythe-blades', {
    kind: 'trap', complexity: 'simple', level: 4,
    stealth: { dc: 23, rank: 'trained' },
    disable: [{ dc: 21, skill: 'skill.thievery', rank: 'trained', text: 'hazard.scythe-blades.disable.0' }],
    ac: { value: 21 }, saves: { fortitude: 12, reflex: 8 },
    parts: [{ hardness: 11, hp: 44, bt: 22 }],
    abilities: [{ id: 'falling-scythes', name: 'hazard.scythe-blades.abilities.falling-scythes.name', actions: 'reaction', trigger: 'hazard.scythe-blades.abilities.falling-scythes.trigger', text: 'hazard.scythe-blades.abilities.falling-scythes.text' }],
    reset: 'hazard.scythe-blades.reset',
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

  it('accepts a complex hazard with named parts, a routine and a counteract option', () => {
    const pit = record('hazard', 'drowning-pit', {
      kind: 'trap', complexity: 'complex', level: 3,
      stealth: { modifier: 10, rank: 'trained', note: 'hazard.drowning-pit.stealth.note' },
      disable: [
        { dc: 18, skill: 'skill.thievery', rank: 'trained', text: 'hazard.drowning-pit.disable.0' },
        { counteract: { spell: 'spell.dispel-magic', rank: 3, dc: 20 }, text: 'hazard.drowning-pit.disable.1' },
      ],
      disableNote: 'hazard.drowning-pit.disable-note',
      parts: [{ name: 'hazard.drowning-pit.parts.0.name', hardness: 15, hp: 60, bt: 30 }, { name: 'hazard.drowning-pit.parts.1.name', hardness: 8, hp: 32, bt: 16 }],
      routine: { actions: 4, text: 'hazard.drowning-pit.routine' },
      special: 'hazard.drowning-pit.special',
    });
    expect(issuesFor('hazard', pit)).toEqual([]);
  });

  it('accepts a hazard part with HP but no Hardness, and a routine with traits', () => {
    const web = { ...VALID.hazard, kind: 'environmental', parts: [{ hp: 26, bt: 13 }] };
    expect(issuesFor('hazard', { ...VALID.hazard, parts: [{ hardness: 18, hp: 120, bt: 60, note: 'hazard.scythe-blades.parts.0.note' }] })).toEqual([]);
    expect(issuesFor('hazard', web)).toEqual([]);
    const haunt = { ...VALID.hazard, complexity: 'complex', routine: { actions: 1, traits: ['illusion', 'occult'], text: 'hazard.scythe-blades.routine' } };
    expect(issuesFor('hazard', haunt)).toEqual([]);
  });

  it('rejects a routine on a simple hazard, a stealth with both dc and modifier, and a disable option with both dc and counteract', () => {
    expect(issuesFor('hazard', { ...VALID.hazard, routine: { actions: 1, text: 'hazard.scythe-blades.routine' } }).length).toBeGreaterThan(0);
    expect(issuesFor('hazard', { ...VALID.hazard, stealth: { dc: 23, modifier: 13 } }).some((m) => m.includes('/stealth'))).toBe(true);
    const both = { ...VALID.hazard, disable: [{ dc: 20, counteract: { spell: 'spell.dispel-magic', rank: 3, dc: 20 }, text: 'hazard.scythe-blades.disable.0' }] };
    expect(issuesFor('hazard', both).some((m) => m.includes('/disable/0'))).toBe(true);
    expect(issuesFor('hazard', { ...VALID.hazard, disable: [] }).some((m) => m.includes('/disable'))).toBe(true);
  });

  it('accepts a curse with an effect, a cursed-item template, and a curse of varying level', () => {
    const curse = record('affliction', 'curse-of-nightmares', { kind: 'curse', level: 2, save: { type: 'will', dc: 16 }, effect: 'affliction.curse-of-nightmares.effect' });
    expect(issuesFor('affliction', curse)).toEqual([]);
    const template = record('affliction', 'ravenous', { kind: 'curse', level: 1, usage: 'affliction.ravenous.usage', effect: 'affliction.ravenous.effect', text: undefined });
    expect(issuesFor('affliction', template)).toEqual([]);
    const grave = record('affliction', 'grave-curse', { kind: 'curse', save: { type: 'will' }, saveNote: 'affliction.grave-curse.save-note', effect: 'affliction.grave-curse.effect' });
    expect(issuesFor('affliction', grave)).toEqual([]);
  });

  it('rejects an affliction with both stages and effect, or with neither', () => {
    const both = { ...VALID.affliction, effect: 'affliction.scarlet-leprosy.effect' };
    expect(issuesFor('affliction', both).some((m) => m.includes('oneOf'))).toBe(true);
    const neither = { ...VALID.affliction, stages: undefined };
    expect(issuesFor('affliction', neither).some((m) => m.includes('oneOf'))).toBe(true);
  });

  it('rejects a saveNote beside a dc, and a duration that is not a whole positive amount of a known unit', () => {
    const note = { ...VALID.affliction, saveNote: 'affliction.scarlet-leprosy.save-note' };
    expect(issuesFor('affliction', note).length).toBeGreaterThan(0);
    const badUnit = { ...VALID.affliction, onset: { amount: 1, unit: 'fortnight' } };
    expect(issuesFor('affliction', badUnit).some((m) => m.includes('/onset/unit'))).toBe(true);
    const zero = { ...VALID.affliction, onset: { amount: 0, unit: 'day' } };
    expect(issuesFor('affliction', zero).some((m) => m.includes('/onset/amount'))).toBe(true);
  });

  it('accepts an artifact item of level 28 and rejects level 29 with exactly one issue', () => {
    expect(issuesFor('item', { ...WEAPON, level: 28 })).toEqual([]);
    const issues = issuesFor('item', { ...WEAPON, level: 29 });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('/level must be <= 28');
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

  it('accepts a weapon whose damage type is a choice, as a modular weapon is printed', () => {
    const modular = { ...WEAPON, weapon: { ...(WEAPON.weapon as object), damage: { dice: '1d6', types: ['bludgeoning', 'piercing', 'slashing'] } } };
    expect(issuesFor('item', modular)).toEqual([]);
  });

  it('rejects a weapon damage with both a type and types, and one with neither', () => {
    const both = { ...WEAPON, weapon: { ...(WEAPON.weapon as object), damage: { dice: '1d6', type: 'piercing', types: ['bludgeoning', 'piercing'] } } };
    expect(issuesFor('item', both).some((m) => m.includes('/weapon/damage must match exactly one schema in oneOf'))).toBe(true);
    const neither = { ...WEAPON, weapon: { ...(WEAPON.weapon as object), damage: { dice: '1d6' } } };
    expect(issuesFor('item', neither).some((m) => m.includes('/weapon/damage must match exactly one schema in oneOf'))).toBe(true);
  });

  it('rejects weapon damage types that hold one type, repeat one, or name none the dataset knows', () => {
    const withTypes = (types: string[]) => ({ ...WEAPON, weapon: { ...(WEAPON.weapon as object), damage: { dice: '1d6', types } } });
    expect(issuesFor('item', withTypes(['piercing'])).some((m) => m.includes('/weapon/damage/types must NOT have fewer than 2 items'))).toBe(true);
    expect(issuesFor('item', withTypes(['piercing', 'piercing'])).some((m) => m.includes('/weapon/damage/types must NOT have duplicate items'))).toBe(true);
    expect(issuesFor('item', withTypes(['piercing', 'modular'])).some((m) => m.includes('/weapon/damage/types/1 must be equal to one of the allowed values'))).toBe(true);
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

  it('accepts a background trained in two skills, as the feral child is', () => {
    expect(issuesFor('background', { ...VALID.background, skills: ['skill.nature', 'skill.survival'] })).toEqual([]);
  });

  it('rejects a background skills list with more than two entries with exactly one issue', () => {
    const issues = issuesFor('background', { ...VALID.background, skills: ['skill.intimidation', 'skill.deception', 'skill.nature'] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('/skills must NOT have more than 2 items');
  });

  it('accepts a background with no lore and no feat, as the rare ones are printed', () => {
    const { lore: _lore, feat: _feat, ...bare } = VALID.background;
    expect(issuesFor('background', bare)).toEqual([]);
  });

  it('accepts a background with a feat and no lore, and one with a lore and no feat', () => {
    const { lore: _lore, ...noLore } = VALID.background;
    const { feat: _feat, ...noFeat } = VALID.background;
    expect(issuesFor('background', noLore)).toEqual([]);
    expect(issuesFor('background', noFeat)).toEqual([]);
  });

  it('still rejects a background without boosts or without skills', () => {
    const { boosts: _boosts, ...noBoosts } = VALID.background;
    const { skills: _skills, ...noSkills } = VALID.background;
    expect(issuesFor('background', noBoosts).some((m) => m.includes("must have required property 'boosts'"))).toBe(true);
    expect(issuesFor('background', noSkills).some((m) => m.includes("must have required property 'skills'"))).toBe(true);
  });

  it('accepts a background with one boost and one with three', () => {
    expect(issuesFor('background', { ...VALID.background, boosts: [['str', 'dex', 'con']] })).toEqual([]);
    expect(issuesFor('background', { ...VALID.background, boosts: ['free', 'free', 'free'] })).toEqual([]);
  });

  it('rejects a background with no boosts and one with four, each with exactly one issue', () => {
    const none = issuesFor('background', { ...VALID.background, boosts: [] });
    expect(none).toHaveLength(1);
    expect(none[0]).toContain('/boosts must NOT have fewer than 1 items');
    const four = issuesFor('background', { ...VALID.background, boosts: ['free', 'free', 'free', 'free'] });
    expect(four).toHaveLength(1);
    expect(four[0]).toContain('/boosts must NOT have more than 3 items');
  });

  it('accepts a background grants entry that is an ability, a feat, a spell or an item', () => {
    const grant = { name: 'background.warrior.grants.0.name', text: 'background.warrior.grants.0.text' };
    for (const extra of [{}, { feat: 'feat.additional-lore' }, { spell: 'spell.guidance' }, { item: 'item.clan-dagger' }]) {
      expect(issuesFor('background', { ...VALID.background, grants: [{ ...grant, ...extra }] })).toEqual([]);
    }
  });

  it('rejects an empty background grants list with exactly one issue', () => {
    const issues = issuesFor('background', { ...VALID.background, grants: [] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('/grants must NOT have fewer than 1 items');
  });

  it('rejects a background grants entry without its name or its text', () => {
    const noText = issuesFor('background', { ...VALID.background, grants: [{ name: 'background.warrior.grants.0.name' }] });
    expect(noText.some((m) => m.includes("must have required property 'text'"))).toBe(true);
    const noName = issuesFor('background', { ...VALID.background, grants: [{ text: 'background.warrior.grants.0.text' }] });
    expect(noName.some((m) => m.includes("must have required property 'name'"))).toBe(true);
  });

  it('rejects a background grants entry with a property the schema does not know, or a feat that is not a feat', () => {
    const grant = { name: 'background.warrior.grants.0.name', text: 'background.warrior.grants.0.text' };
    const unknown = issuesFor('background', { ...VALID.background, grants: [{ ...grant, sense: 'low-light-vision' }] });
    expect(unknown.some((m) => m.includes('must NOT have additional properties'))).toBe(true);
    const notFeat = issuesFor('background', { ...VALID.background, grants: [{ ...grant, feat: 'spell.guidance' }] });
    expect(notFeat.some((m) => m.includes('/grants/0/feat must match pattern'))).toBe(true);
    const list = issuesFor('background', { ...VALID.background, feat: ['feat.diehard', 'feat.additional-lore'] });
    expect(list.some((m) => m.includes('/feat must be string'))).toBe(true);
  });

  it('accepts an empty background skills list when choices supply a skill', () => {
    const withChoice = { ...VALID.background, skills: [], choices: [{ count: 1, from: ['skill.arcana', 'skill.nature', 'skill.occultism', 'skill.religion'] }] };
    expect(issuesFor('background', withChoice)).toEqual([]);
  });

  it('accepts a background skills.choices with a described choice', () => {
    const withChoice = { ...VALID.background, skills: [], choices: [{ text: 'background.raised-by-belief.skill-choice.0' }] };
    expect(issuesFor('background', withChoice)).toEqual([]);
  });

  it('accepts a background with empty skills and no choices', () => {
    // The amnesiac trains no skill at all, so no rule anywhere asks for one.
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

  it('accepts text on a Strike effect that names one of the creature\'s own abilities, and rejects an own with an ability beside it', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].effects = [{ own: 'mauler', text: 'creature.cave-bear.strikes.claw.effects.0' }];
    expect(issuesFor('creature', c)).toEqual([]);
    c.strikes[0].effects = [{ own: 'mauler', text: 'creature.cave-bear.strikes.claw.effects.0', ability: 'ability.grab' }];
    expect(issuesFor('creature', c).join('\n')).toContain('/strikes/0/effects/0');
  });

  it('accepts a Strike effect that is a choice between two or more plain effects', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].effects = [
      { choice: [{ ability: 'ability.grab' }, { ability: 'ability.knockdown' }] },
      { choice: [{ ability: 'ability.push', text: 'creature.cave-bear.strikes.claw.effects.1.0' }, { own: 'mauler' }, { text: 'creature.cave-bear.strikes.claw.effects.1.2' }] },
    ];
    expect(issuesFor('creature', c)).toEqual([]);
  });

  it('rejects a choice of one, a choice that nests a choice, an empty item and a choice with a sibling property', () => {
    const c = structuredClone(VALID.creature) as any;
    for (const bad of [
      { choice: [{ ability: 'ability.grab' }] },
      { choice: [] },
      { choice: [{ ability: 'ability.grab' }, { choice: [{ ability: 'ability.push' }, { ability: 'ability.knockdown' }] }] },
      { choice: [{ ability: 'ability.grab' }, {}] },
      { choice: [{ ability: 'ability.grab' }, { ability: 'ability.push', own: 'mauler' }] },
      { choice: [{ ability: 'ability.grab' }, { ability: 'ability.push' }], text: 'creature.cave-bear.strikes.claw.effects.0' },
    ]) {
      c.strikes[0].effects = [bad];
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(bad)).toContain('/strikes/0/effects/0');
    }
  });

  it('accepts splash damage, and rejects a splash that is not true', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].damage = [{ dice: '2d6', type: 'acid' }, { dice: '1d6', type: 'acid', splash: true }];
    expect(issuesFor('creature', c)).toEqual([]);
    for (const splash of [false, 'yes', 1]) {
      c.strikes[0].damage[1].splash = splash;
      expect(issuesFor('creature', c).join('\n')).toContain('/strikes/0/damage/1');
    }
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

  it('accepts what a creature carries: an item, an item with its runes, a name alone, a count, ammunition, a shield, a note', () => {
    const c = structuredClone(VALID.creature) as any;
    c.items = [
      { item: 'item.longsword' },
      { item: 'item.longsword', potency: 1, runes: [{ item: 'item.striking' }], material: 'silver' },
      { item: 'item.full-plate', potency: 2, runes: [{ item: 'item.resilient-greater' }, { item: 'item.invisibility' }] },
      { item: 'item.javelin', count: 4 },
      { item: 'item.longbow', ammunition: { item: 'item.arrows', count: 20 } },
      { item: 'item.sling', ammunition: { name: 'creature.cave-bear.items.4.ammunition.name', count: 12 } },
      { item: 'item.steel-shield', hardness: 5, hp: 20, bt: 10 },
      { name: 'creature.cave-bear.items.7.name', note: 'creature.cave-bear.items.7.note' },
      { item: 'item.club', name: 'creature.cave-bear.items.8.name' },
    ];
    expect(issuesFor('creature', c)).toEqual([]);
    c.strikes[0].item = 'item.longsword';
    expect(issuesFor('creature', c)).toEqual([]);
  });

  it('rejects an empty items list, an entry with neither an item nor a name, and an unknown field', () => {
    const c = structuredClone(VALID.creature) as any;
    for (const bad of [[], [{}], [{ count: 2 }], [{ item: 'item.longsword', price: 5 }]]) {
      c.items = bad;
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(bad)).toContain('/items');
    }
  });

  it('rejects a carried entry with an item that is not an item id, a name that is not a key, and a bad potency, count or material', () => {
    const c = structuredClone(VALID.creature) as any;
    for (const bad of [
      { item: 'longsword' }, { item: 'spell.longsword' }, { name: 'panpipes' },
      { item: 'item.longsword', potency: 0 }, { item: 'item.longsword', potency: 5 }, { item: 'item.longsword', potency: 1.5 },
      { item: 'item.javelin', count: 1 }, { item: 'item.javelin', count: '4' },
      { item: 'item.longsword', material: 'Cold Iron' },
      { item: 'item.longsword', note: 'see sidebar' },
    ]) {
      c.items = [bad];
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(bad)).toContain('/items/0');
    }
  });

  it('rejects potency, runes or a material on an entry that has no item, a rune without an item, and a rune\'s variant (a grade is its own record)', () => {
    const c = structuredClone(VALID.creature) as any;
    for (const bad of [
      { name: 'creature.cave-bear.items.0.name', potency: 1 },
      { name: 'creature.cave-bear.items.0.name', runes: [{ item: 'item.striking' }] },
      { item: 'item.longsword', runes: [] },
      { item: 'item.longsword', runes: [{ variant: 'greater' }] },
      { item: 'item.longsword', runes: [{ item: 'item.striking', variant: 'greater' }] },
      { item: 'item.longsword', runes: [{ item: 'item.striking', price: 1 }] },
      { name: 'creature.cave-bear.items.0.name', material: 'silver' },
    ]) {
      c.items = [bad];
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(bad)).toContain('/items/0');
    }
  });

  it('rejects ammunition without a count, with neither an item nor a name, with both (it is named once), with a count below one, and with a name that is not a key', () => {
    const c = structuredClone(VALID.creature) as any;
    for (const ammunition of [{ item: 'item.arrows' }, { count: 20 }, { item: 'item.arrows', count: 0 }, { item: 'item.arrows', count: 20, note: 'x' }, { name: 'arrows', count: 20 }, { item: 'item.arrows', name: 'creature.cave-bear.items.0.ammunition.name', count: 20 }]) {
      c.items = [{ item: 'item.longbow', ammunition }];
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(ammunition)).toContain('/items/0/ammunition');
    }
  });

  it('rejects a shield with only some of hardness, hp and bt', () => {
    const c = structuredClone(VALID.creature) as any;
    for (const bad of [{ hardness: 5 }, { hp: 20 }, { bt: 10 }, { hardness: 5, hp: 20 }, { hp: 20, bt: 10 }]) {
      c.items = [{ item: 'item.steel-shield', ...bad }];
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(bad)).toContain('/items/0');
    }
  });

  it('rejects a Strike\'s item that is not an item id', () => {
    const c = structuredClone(VALID.creature) as any;
    for (const item of ['longsword', 'spell.longsword', 5, '']) {
      c.strikes[0].item = item;
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(item)).toContain('/strikes/0/item');
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

  const SPELLS = [{ spell: 'spell.heal' }, { spell: 'spell.noise-blast', atWill: true }, { spell: 'spell.harm', count: 4 }, { spell: 'spell.invisibility', atWill: true, note: 'creature.cave-bear.spellcasting.0.ranks.2.0.note' }];
  const innate = () => ({
    kind: 'innate', tradition: 'divine', dc: 23, attack: 15,
    cantrips: { rank: 3, spells: [{ spell: 'spell.shield' }] },
    ranks: [{ rank: 1, spells: SPELLS }, { rank: 3, spells: [{ spell: 'spell.heal' }] }],
    constant: [{ rank: 5, spells: [{ spell: 'spell.truespeech' }] }],
  });
  const withBlocks = (blocks: unknown[]) => { const c = structuredClone(VALID.creature) as any; c.spellcasting = blocks; return c; };

  it('accepts a creature\'s spellcasting: every kind of block, a spell that is at will, repeated or restricted, and a spontaneous rank\'s slots', () => {
    const spontaneous = { kind: 'spontaneous', tradition: 'arcane', dc: 22, cantrips: { rank: 3, spells: [{ spell: 'spell.shield' }] }, ranks: [{ rank: 1, spells: [{ spell: 'spell.fear' }], slots: 4 }, { rank: 2, spells: [{ spell: 'spell.fear' }] }] };
    const focus = { kind: 'focus', name: 'creature.cave-bear.spellcasting.1.name', focusPoints: 1, dc: 18, ranks: [{ rank: 1, spells: [{ spell: 'spell.deaths-call' }] }] };
    const prepared = { kind: 'prepared', tradition: 'divine', dc: 18, ranks: [{ rank: 1, spells: [{ spell: 'spell.harm', count: 4 }] }] };
    expect(issuesFor('creature', withBlocks([innate(), spontaneous, prepared, focus]))).toEqual([]);
    expect(issuesFor('creature', withBlocks([{ kind: 'innate', tradition: 'primal', dc: 40, constant: [{ rank: 4, spells: [{ spell: 'spell.fly' }] }] }]))).toEqual([]);
  });

  it('rejects a spellcasting that is empty or not an array', () => {
    expect(issuesFor('creature', withBlocks([])).join('\n')).toContain('/spellcasting');
    expect(issuesFor('creature', withBlocks(innate() as any)).join('\n')).toContain('/spellcasting');
  });

  it('rejects a block without a kind, a DC, or any spell, and one of an unknown kind or tradition', () => {
    const { kind: _k, ...noKind } = innate();
    const { dc: _d, ...noDc } = innate();
    const { cantrips: _c, ranks: _r, constant: _o, ...noSpells } = innate();
    const bad = [noKind, noDc, noSpells, { ...innate(), kind: 'wild' }, { ...innate(), tradition: 'elemental' }, { ...innate(), tradition: undefined }, { ...innate(), dc: '23' }, { ...innate(), attack: 15.5 }];
    for (const b of bad) expect(issuesFor('creature', withBlocks([b])).join('\n'), JSON.stringify(b)).toContain('/spellcasting/0');
  });

  it('rejects an empty list of ranks, constants or spells, which says nothing', () => {
    const empties = [{ ...innate(), ranks: [] }, { ...innate(), constant: [] }, { ...innate(), cantrips: { rank: 3, spells: [] } }, { ...innate(), ranks: [{ rank: 1, spells: [] }] }];
    for (const b of empties) expect(issuesFor('creature', withBlocks([b])).join('\n'), JSON.stringify(b)).toContain('/spellcasting/0');
    // A block of one list and an empty other is the same as a block without it, and says nothing for the empty one.
    expect(issuesFor('creature', withBlocks([{ kind: 'innate', tradition: 'divine', dc: 20, ranks: [] }])).join('\n')).toContain('/spellcasting/0');
  });

  it('rejects a focus block with a tradition, without its name or points, and any other block with a name or points', () => {
    const focus = { kind: 'focus', name: 'creature.cave-bear.spellcasting.0.name', focusPoints: 2, dc: 21, ranks: [{ rank: 1, spells: [{ spell: 'spell.heal' }] }] };
    expect(issuesFor('creature', withBlocks([focus]))).toEqual([]);
    const { name: _n, ...noName } = focus;
    const { focusPoints: _p, ...noPoints } = focus;
    for (const b of [{ ...focus, tradition: 'divine' }, noName, noPoints, { ...focus, focusPoints: 0 }, { ...innate(), name: 'creature.cave-bear.spellcasting.0.name' }, { ...innate(), focusPoints: 1 }]) {
      expect(issuesFor('creature', withBlocks([b])).join('\n'), JSON.stringify(b)).toContain('/spellcasting/0');
    }
  });

  it('rejects slots anywhere but a spontaneous block\'s ranks, and a slot count that is not a positive whole number', () => {
    const spontaneous = (slots: unknown) => ({ kind: 'spontaneous', tradition: 'arcane', dc: 22, ranks: [{ rank: 1, spells: [{ spell: 'spell.fear' }], slots }] });
    expect(issuesFor('creature', withBlocks([spontaneous(3)]))).toEqual([]);
    for (const slots of [0, -1, 1.5, '3']) expect(issuesFor('creature', withBlocks([spontaneous(slots)])).join('\n'), String(slots)).toContain('/spellcasting/0');
    const innateSlots = { ...innate(), ranks: [{ rank: 1, spells: [{ spell: 'spell.heal' }], slots: 2 }] };
    const preparedSlots = { kind: 'prepared', tradition: 'divine', dc: 18, ranks: [{ rank: 1, spells: [{ spell: 'spell.harm' }], slots: 2 }] };
    const focusSlots = { kind: 'focus', name: 'creature.cave-bear.spellcasting.0.name', focusPoints: 1, dc: 18, ranks: [{ rank: 1, spells: [{ spell: 'spell.harm' }], slots: 2 }] };
    const constantSlots = { kind: 'spontaneous', tradition: 'arcane', dc: 22, constant: [{ rank: 1, spells: [{ spell: 'spell.fear' }], slots: 2 }] };
    for (const b of [innateSlots, preparedSlots, focusSlots, constantSlots]) expect(issuesFor('creature', withBlocks([b])).join('\n'), JSON.stringify(b)).toContain('/spellcasting/0');
  });

  it('rejects a spell entry that is not a spell reference, a count under two, an at-will that is not true, or a note that is not a key', () => {
    const entry = (e: unknown) => withBlocks([{ kind: 'innate', tradition: 'divine', dc: 20, ranks: [{ rank: 1, spells: [e] }] }]);
    expect(issuesFor('creature', entry({ spell: 'spell.heal', count: 2, note: 'creature.cave-bear.spellcasting.0.ranks.1.0.note' }))).toEqual([]);
    expect(issuesFor('creature', entry({ spell: 'spell.heal', atWill: true, note: 'creature.cave-bear.spellcasting.0.ranks.1.0.note' }))).toEqual([]);
    for (const bad of [{ spell: 'Heal' }, { spell: 'feat.heal' }, { atWill: true }, { spell: 'spell.heal', count: 1 }, { spell: 'spell.heal', count: 2.5 }, { spell: 'spell.heal', atWill: false }, { spell: 'spell.heal', note: 'self only' }, { spell: 'spell.heal', text: 'x' }]) {
      expect(issuesFor('creature', entry(bad)).join('\n'), JSON.stringify(bad)).toContain('/spellcasting/0');
    }
  });

  it('rejects a spell that is both at will and counted: a spell is cast at will or so many times a day, not both', () => {
    const entry = (e: unknown) => withBlocks([{ kind: 'innate', tradition: 'divine', dc: 20, ranks: [{ rank: 1, spells: [e] }] }]);
    expect(issuesFor('creature', entry({ spell: 'spell.heal', count: 2, atWill: true })).join('\n')).toContain('/spellcasting/0');
  });

  it('rejects a DC below 1, in every kind of block', () => {
    const spells = [{ spell: 'spell.heal' }];
    const blocks = (dc: number) => [
      { kind: 'innate', tradition: 'divine', dc, ranks: [{ rank: 1, spells }] },
      { kind: 'spontaneous', tradition: 'arcane', dc, ranks: [{ rank: 1, spells }] },
      { kind: 'focus', name: 'creature.cave-bear.spellcasting.0.name', focusPoints: 1, dc, ranks: [{ rank: 1, spells }] },
    ];
    for (const b of blocks(1)) expect(issuesFor('creature', withBlocks([b])), b.kind).toEqual([]);
    for (const dc of [0, -3]) for (const b of blocks(dc)) expect(issuesFor('creature', withBlocks([b])).join('\n'), `${b.kind} ${dc}`).toContain('/spellcasting/0');
  });

  it('rejects a rank outside 1 to 10, among cantrips, ranks and constants alike', () => {
    for (const rank of [0, 11, 1.5, '3']) {
      expect(issuesFor('creature', withBlocks([{ ...innate(), ranks: [{ rank, spells: [{ spell: 'spell.heal' }] }] }])).join('\n'), String(rank)).toContain('/spellcasting/0');
      expect(issuesFor('creature', withBlocks([{ ...innate(), cantrips: { rank, spells: [{ spell: 'spell.shield' }] } }])).join('\n'), String(rank)).toContain('/spellcasting/0');
      expect(issuesFor('creature', withBlocks([{ ...innate(), constant: [{ rank, spells: [{ spell: 'spell.fly' }] }] }])).join('\n'), String(rank)).toContain('/spellcasting/0');
    }
  });

  it('accepts a sense that is a spell, with its acuity and range, and rejects one that also names an ability or text', () => {
    const c = structuredClone(VALID.creature) as any;
    c.perception.senses = [{ spell: 'spell.truesight' }, { spell: 'spell.see-the-unseen', acuity: 'precise', range: 60 }];
    expect(issuesFor('creature', c)).toEqual([]);
    for (const bad of [{ spell: 'spell.truesight', ability: 'ability.darkvision' }, { spell: 'spell.truesight', text: 'creature.cave-bear.senses.0' }, { spell: 'truesight' }, { spell: 'ability.truesight' }]) {
      c.perception.senses = [bad];
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(bad)).toContain('/perception/senses/0');
    }
  });

  it('accepts text on a sense that is a universal ability, for what the stat block prints beyond its name (greater darkvision)', () => {
    const c = structuredClone(VALID.creature) as any;
    c.perception.senses = [{ ability: 'ability.darkvision', text: 'creature.cave-bear.senses.0' }];
    expect(issuesFor('creature', c)).toEqual([]);
    c.perception.senses = [{ own: 'web-sense', text: 'creature.cave-bear.senses.0' }];
    expect(issuesFor('creature', c).join('\n')).toContain('/perception/senses/0');
  });

  it('accepts a damage part with a choice of type, a note, and the persistent and splash parts that go with it', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].damage = [
      { dice: '2d12', types: ['bludgeoning', 'piercing', 'slashing'], note: 'creature.cave-bear.strikes.claw.damage.0.note' },
      { dice: '1d6', types: ['acid', 'cold', 'fire'] },
      { dice: '1', types: ['acid', 'cold', 'fire'], persistent: true, note: 'creature.cave-bear.strikes.claw.damage.2.note' },
      { dice: '1', types: ['acid', 'cold', 'fire'], splash: true, note: 'creature.cave-bear.strikes.claw.damage.3.note' },
      { dice: '1d4', type: 'spirit', note: 'creature.cave-bear.strikes.claw.damage.4.note' },
    ];
    expect(issuesFor('creature', c)).toEqual([]);
  });

  it('rejects a damage part that has both a type and types, neither, one type in types, a repeated one, an unknown one, or a note that is not a key', () => {
    const c = structuredClone(VALID.creature) as any;
    for (const bad of [
      { dice: '2d6', type: 'fire', types: ['acid', 'cold'] },
      { dice: '2d6' },
      { dice: '2d6', types: ['fire'] },
      { dice: '2d6', types: [] },
      { dice: '2d6', types: ['fire', 'fire'] },
      { dice: '2d6', types: ['fire', 'lightning'] },
      { dice: '2d6', types: 'fire' },
      { types: ['acid', 'cold'] },
      { dice: '2d6', type: 'fire', note: 'when it burns' },
      { dice: '2d6', type: 'fire', text: 'creature.cave-bear.strikes.claw.damage.0.note' },
    ]) {
      c.strikes[0].damage = [bad];
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(bad)).toContain('/strikes/0/damage/0');
    }
  });

  it('accepts a damage item that is a choice between two or more plain parts, and rejects a choice of one, an empty one, a nested one, a sibling property, or a bad alternative', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].damage = [
      { dice: '3d6', type: 'fire' },
      { choice: [{ dice: '1d6', type: 'vitality' }, { dice: '1d6', type: 'void' }] },
      { choice: [{ dice: '1d6', types: ['acid', 'cold'] }, { dice: '1d4', type: 'bleed', persistent: true }, { dice: '1', type: 'fire', splash: true, note: 'creature.cave-bear.strikes.claw.damage.1.choice.2.note' }] },
    ];
    expect(issuesFor('creature', c)).toEqual([]);
    const pair = [{ dice: '1d6', type: 'vitality' }, { dice: '1d6', type: 'void' }];
    for (const bad of [
      { choice: [pair[0]] },
      { choice: [] },
      { choice: [pair[0], { choice: pair }] },
      { choice: [pair[0], {}] },
      { choice: [pair[0], { dice: '1d6', type: 'lightning' }] },
      { choice: pair, dice: '1d6' },
      { choice: pair, type: 'fire' },
      { choice: pair, note: 'creature.cave-bear.strikes.claw.damage.0.note' },
    ]) {
      c.strikes[0].damage = [bad];
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(bad)).toContain('/strikes/0/damage/0');
    }
  });

  it('accepts `instead: true` on an own or universal ability effect, and rejects it on text, when false, or not a boolean', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].effects = [{ own: 'mauler', instead: true }, { ability: 'ability.grab', instead: true }, { own: 'mauler', instead: true, text: 'creature.cave-bear.strikes.claw.effects.2' }];
    expect(issuesFor('creature', c)).toEqual([]);
    for (const bad of [{ own: 'mauler', instead: false }, { own: 'mauler', instead: 'yes' }, { text: 'creature.cave-bear.strikes.claw.effects.0', instead: true }, { item: 'item.darkening-poison', instead: true }, { choice: [{ own: 'mauler' }, { own: 'rush' }], instead: true }]) {
      c.strikes[0].effects = [bad];
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(bad)).toContain('/strikes/0/effects/0');
    }
  });

  it('accepts an effect that is an item, with text, alone or inside a choice, and rejects one with a bad item or another name beside it', () => {
    const c = structuredClone(VALID.creature) as any;
    c.strikes[0].effects = [
      { item: 'item.darkening-poison' },
      { item: 'item.lethargy-poison', text: 'creature.cave-bear.strikes.claw.effects.1' },
      { choice: [{ own: 'mauler' }, { item: 'item.spider-venom' }] },
    ];
    expect(issuesFor('creature', c)).toEqual([]);
    for (const bad of [{ item: 'darkening-poison' }, { item: 'spell.heal' }, { item: 'item.darkening-poison', own: 'mauler' }, { item: 'item.darkening-poison', ability: 'ability.grab' }, { item: 'item.darkening-poison', text: 'one dose' }, { choice: [{ item: 'item.spider-venom' }] }]) {
      c.strikes[0].effects = [bad];
      expect(issuesFor('creature', c).join('\n'), JSON.stringify(bad)).toContain('/strikes/0/effects/0');
    }
  });

  it('accepts immunitiesNote, with immunities or alone, and rejects one that is not a key or is empty', () => {
    const c = structuredClone(VALID.creature) as any;
    c.immunities = ['electricity'];
    c.immunitiesNote = 'creature.cave-bear.immunities.note';
    expect(issuesFor('creature', c)).toEqual([]);
    delete c.immunities;
    expect(issuesFor('creature', c)).toEqual([]);
    for (const bad of ['see lightning drinker', '', 3]) {
      c.immunitiesNote = bad;
      expect(issuesFor('creature', c).join('\n'), String(bad)).toContain('/immunitiesNote');
    }
    c.immunitiesNote = 'creature.cave-bear.immunities.note';
    c.immunities = [];
    expect(issuesFor('creature', c).join('\n')).toContain('/immunities');
  });

  it('accepts a spell entry that is only a name, and rejects one that also has a spell, a count, at will, a note, or no key', () => {
    const entry = (e: unknown) => withBlocks([{ kind: 'innate', tradition: 'divine', dc: 20, ranks: [{ rank: 2, spells: [{ spell: 'spell.heal' }, e] }] }]);
    expect(issuesFor('creature', entry({ name: 'creature.cave-bear.spellcasting.0.ranks.0.1.name' }))).toEqual([]);
    for (const bad of [
      { name: 'creature.cave-bear.spellcasting.0.ranks.0.1.name', spell: 'spell.heal' },
      { name: 'creature.cave-bear.spellcasting.0.ranks.0.1.name', count: 2 },
      { name: 'creature.cave-bear.spellcasting.0.ranks.0.1.name', atWill: true },
      { name: 'creature.cave-bear.spellcasting.0.ranks.0.1.name', note: 'creature.cave-bear.spellcasting.0.ranks.0.1.note' },
      { name: 'one spell' },
      {},
    ]) {
      expect(issuesFor('creature', entry(bad)).join('\n'), JSON.stringify(bad)).toContain('/spellcasting/0');
    }
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
  describe('rituals', () => {
    const ritual = () => structuredClone(VALID.ritual) as any;
    const FULL = () => {
      const r = ritual();
      r.cost = 'ritual.geas.cost'; r.secondaryCasters = 2; r.area = 'ritual.geas.area';
      r.secondaryCastersNote = 'ritual.geas.secondary-casters.note'; r.requirements = 'ritual.geas.requirements';
      r.primaryCheck[0].note = 'ritual.geas.primary-check.0.note';
      r.secondaryChecks = [
        { lore: 'ritual.geas.secondary-checks.0.lore' },
        { oneOf: [{ skill: 'skill.arcana' }, { skill: 'skill.nature' }, { lore: 'ritual.geas.secondary-checks.1.2.lore' }], note: 'ritual.geas.secondary-checks.1.note' },
        { skill: 'skill.crafting', note: 'ritual.geas.secondary-checks.2.note' },
      ];
      return r;
    };

    it('accepts a ritual with every optional field, a condition on a check, a Lore and a choice of three', () => {
      expect(issuesFor('ritual', FULL())).toEqual([]);
    });

    it('accepts a condition on a choice, on a single skill, the number of secondary casters with its qualifier, and requirements', () => {
      const r = ritual();
      r.secondaryChecks = [{ oneOf: [{ skill: 'skill.nature' }, { skill: 'skill.religion' }], note: 'ritual.geas.secondary-checks.0.note' }];
      r.secondaryCasters = 2; r.secondaryCastersNote = 'ritual.geas.secondary-casters.note';
      r.requirements = 'ritual.geas.requirements';
      expect(issuesFor('ritual', r)).toEqual([]);
    });

    it('accepts a primary check with no rank, the book printing none, and still rejects a rank that is not one', () => {
      const r = ritual();
      r.primaryCheck = [{ skill: 'skill.religion' }, { skill: 'skill.nature', note: 'ritual.geas.primary-check.1.note' }];
      expect(issuesFor('ritual', r)).toEqual([]);
      expect(issuesFor('ritual', { ...ritual(), primaryCheck: [{ skill: 'skill.religion', rank: 'supreme' }] }).join('\n')).toContain('/primaryCheck/0');
    });

    it('rejects a condition that is not an i18n key, one on a Lore, and one inside a choice', () => {
      const bad: unknown[] = [
        { skill: 'skill.arcana', note: 'whichever is used for the primary check' },
        { oneOf: [{ skill: 'skill.arcana' }, { skill: 'skill.nature' }], note: 'whichever is used for the primary check' },
        { lore: 'ritual.geas.x.lore', note: 'ritual.geas.x.note' },
        { oneOf: [{ skill: 'skill.arcana', note: 'ritual.geas.x.note' }, { skill: 'skill.nature' }] },
        { oneOf: [{ skill: 'skill.arcana' }, { skill: 'skill.nature' }], note: 'ritual.geas.x.note', skill: 'skill.occultism' },
        { note: 'ritual.geas.x.note' },
      ];
      for (const b of bad) expect(issuesFor('ritual', { ...ritual(), secondaryChecks: [b] }).join('\n'), JSON.stringify(b)).toContain('/secondaryChecks/0');
    });

    it('rejects a qualifier on the secondary casters without their number, one that is not a key, and requirements that are not a key', () => {
      expect(ritual().secondaryCasters).toBeUndefined();
      expect(issuesFor('ritual', { ...ritual(), secondaryCastersNote: 'ritual.geas.secondary-casters.note' }).join('\n')).toContain('secondaryCasters');
      expect(issuesFor('ritual', { ...ritual(), secondaryCasters: 2, secondaryCastersNote: 'or more' }).join('\n')).toContain('/secondaryCastersNote');
      expect(issuesFor('ritual', { ...ritual(), requirements: 'a planar key' }).join('\n')).toContain('/requirements');
    });

    it('accepts a ritual with no secondary casters and no secondary checks', () => {
      const r = ritual();
      delete r.secondaryChecks;
      expect(issuesFor('ritual', r)).toEqual([]);
    });

    it('rejects a rank outside 1 to 10', () => {
      for (const rank of [0, 11, 3.5, '3']) expect(issuesFor('ritual', { ...ritual(), rank }).join('\n'), String(rank)).toContain('/rank');
    });

    it('rejects a ritual without text, rank, cast or a primary check', () => {
      for (const key of ['text', 'rank', 'cast', 'primaryCheck']) {
        const r = ritual();
        delete r[key];
        expect(issuesFor('ritual', r).join('\n'), key).toContain(`must have required property '${key}'`);
      }
    });

    it('rejects a cast that is not an i18n key, and zero or no number of secondary casters', () => {
      expect(issuesFor('ritual', { ...ritual(), cast: '1 day' }).join('\n')).toContain('/cast');
      expect(issuesFor('ritual', { ...ritual(), cast: { time: 'ritual.geas.cast' } }).join('\n')).toContain('/cast');
      for (const secondaryCasters of [0, 1.5, '2']) expect(issuesFor('ritual', { ...ritual(), secondaryCasters }).join('\n'), String(secondaryCasters)).toContain('/secondaryCasters');
    });

    it('rejects an empty primary check, and one without a skill or with a rank that is not one', () => {
      expect(issuesFor('ritual', { ...ritual(), primaryCheck: [] }).join('\n')).toContain('/primaryCheck');
      const bad = [{ rank: 'master' }, {}, { skill: 'skill.religion', rank: 'supreme' }, { skill: 'religion', rank: 'master' }, { skill: 'skill.religion', rank: 'master', note: 'you must be a demon' }, { skill: 'skill.religion', rank: 'master', lore: 'ritual.geas.x' }];
      for (const b of bad) expect(issuesFor('ritual', { ...ritual(), primaryCheck: [b] }).join('\n'), JSON.stringify(b)).toContain('/primaryCheck/0');
    });

    it('rejects a secondary check that is empty, mixes a skill and a Lore, or is a choice of one or of a choice', () => {
      expect(issuesFor('ritual', { ...ritual(), secondaryChecks: [] }).join('\n')).toContain('/secondaryChecks');
      const bad = [
        {}, { skill: 'skill.arcana', lore: 'ritual.geas.x.lore' }, { skill: 'arcana' }, { lore: 'Underworld Lore' },
        { oneOf: [{ skill: 'skill.arcana' }] }, { oneOf: [] },
        { oneOf: [{ skill: 'skill.arcana' }, { oneOf: [{ skill: 'skill.nature' }, { skill: 'skill.occultism' }] }] },
        { oneOf: [{ skill: 'skill.arcana' }, { skill: 'skill.nature' }], skill: 'skill.occultism' },
      ];
      for (const b of bad) expect(issuesFor('ritual', { ...ritual(), secondaryChecks: [b] }).join('\n'), JSON.stringify(b)).toContain('/secondaryChecks/0');
    });

    it('rejects a heightened line with a level the book cannot print, and a field the schema does not know', () => {
      expect(issuesFor('ritual', { ...ritual(), heightened: [{ level: '11', text: 'ritual.geas.heightened.0' }] }).join('\n')).toContain('/heightened/0/level');
      expect(issuesFor('ritual', { ...ritual(), heightened: [{ level: '+1' }] }).join('\n')).toContain("must have required property 'text'");
      expect(issuesFor('ritual', { ...ritual(), traditions: ['divine'] }).join('\n')).toContain('traditions');
    });
  });

  describe('a creature\'s rituals', () => {
    const withRituals = (rituals: unknown) => { const c = structuredClone(VALID.creature) as any; c.rituals = rituals; return c; };
    const GOOD = () => ({
      dc: 26,
      ranks: [
        { rank: 1, rituals: [{ ritual: 'ritual.angelic-messenger' }] },
        { rank: 3, rituals: [{ ritual: 'ritual.geas', heightened: 5 }, { ritual: 'ritual.atone' }] },
        { rank: 8, rituals: [{ name: 'creature.cave-bear.rituals.ranks.2.rituals.0.name' }] },
        { rank: 7, rituals: [{ ritual: 'ritual.collective-memories', note: 'creature.cave-bear.rituals.ranks.3.rituals.0.note' }] },
      ],
    });

    it('accepts a ritual line with a record, a heightened rank, a printed name and a note', () => {
      expect(issuesFor('creature', withRituals(GOOD()))).toEqual([]);
    });

    it('rejects rituals that are not an object, without a DC or without lines, or with an empty line', () => {
      expect(issuesFor('creature', withRituals([GOOD()])).join('\n')).toContain('/rituals');
      const { dc: _d, ...noDc } = GOOD();
      const { ranks: _r, ...noRanks } = GOOD();
      for (const r of [noDc, noRanks, { ...GOOD(), dc: 0 }, { ...GOOD(), ranks: [] }, { ...GOOD(), ranks: [{ rank: 1, rituals: [] }] }, { ...GOOD(), extra: 1 }]) {
        expect(issuesFor('creature', withRituals(r)).join('\n'), JSON.stringify(r)).toContain('/rituals');
      }
    });

    it('rejects a line rank outside 1 to 10', () => {
      for (const rank of [0, 11, '3']) {
        expect(issuesFor('creature', withRituals({ dc: 20, ranks: [{ rank, rituals: [{ ritual: 'ritual.geas' }] }] })).join('\n'), String(rank)).toContain('/rituals/ranks/0/rank');
      }
    });

    it('rejects an entry that names both a record and a printed name, or neither, or a record of another type', () => {
      const bad = [{ ritual: 'ritual.geas', name: 'creature.cave-bear.rituals.ranks.0.rituals.0.name' }, {}, { heightened: 5 }, { ritual: 'spell.geas' }, { ritual: 'geas' }, { name: 'Geas' }];
      for (const b of bad) {
        expect(issuesFor('creature', withRituals({ dc: 20, ranks: [{ rank: 3, rituals: [b] }] })).join('\n'), JSON.stringify(b)).toContain('/rituals/ranks/0/rituals/0');
      }
    });

    it('rejects a heightened rank the book cannot print, and a note that is not an i18n key', () => {
      for (const heightened of [1, 11, 5.5, '5']) {
        expect(issuesFor('creature', withRituals({ dc: 20, ranks: [{ rank: 3, rituals: [{ ritual: 'ritual.geas', heightened }] }] })).join('\n'), String(heightened)).toContain('/heightened');
      }
      expect(issuesFor('creature', withRituals({ dc: 20, ranks: [{ rank: 3, rituals: [{ ritual: 'ritual.geas', note: 'see Skeletal Lore' }] }] })).join('\n')).toContain('/note');
    });
  });

  describe('material', () => {
    const precious = () => ({
      id: 'material.adamantine', type: 'material', class: 'precious',
      name: 'material.adamantine.name', text: 'material.adamantine.text',
      traits: ['precious'], rarity: 'uncommon',
      source: { book: 'gm-core', page: 253, revision: '2023-first' },
      review: 'auto', edited: false, level: 8,
      grades: [
        { grade: 'standard', level: 8, pricePerBulkCp: 35000 },
        { grade: 'high', level: 16, pricePerBulkCp: 600000 },
      ],
      raw: [
        { name: 'material.adamantine.raw.0.name', priceCp: 50000, bulk: 'L' },
        { name: 'material.adamantine.raw.1.name', priceCp: 500000, bulk: '1' },
      ],
      hardness: {
        thin: { standard: { hardness: 10, hp: 40, bt: 20 }, high: { hardness: 13, hp: 52, bt: 26 } },
        item: { standard: { hardness: 14, hp: 56, bt: 28 }, high: { hardness: 17, hp: 68, bt: 34 } },
        structure: { standard: { hardness: 28, hp: 112, bt: 56 }, high: { hardness: 34, hp: 136, bt: 68 } },
      },
      gear: {
        weapon: {
          standard: { level: 11, priceCp: 140000, pricePerBulkCp: 14000, craft: 'material.adamantine.gear.weapon.standard.craft' },
          high: { level: 17, priceCp: 1350000, pricePerBulkCp: 135000 },
        },
        armor: { standard: { level: 12, priceCp: 160000, pricePerBulkCp: 16000 } },
      },
    });
    const base = () => ({
      id: 'material.wood', type: 'material', class: 'base',
      name: 'material.wood.name', traits: [], rarity: 'common',
      source: { book: 'gm-core', page: 252, revision: '2023-first' },
      review: 'auto', edited: false,
      hardness: {
        thin: { hardness: 3, hp: 12, bt: 6 },
        item: { hardness: 5, hp: 20, bt: 10 },
        structure: { hardness: 10, hp: 40, bt: 20 },
      },
      exampleItems: 'material.wood.examples',
    });

    it('accepts a full precious material and a base material whose thin rows print no BT', () => {
      expect(issuesFor('material', precious() as any)).toEqual([]);
      const paper = { ...base(), id: 'material.paper', name: 'material.paper.name', exampleItems: 'material.paper.examples',
        hardness: { item: { hardness: 0, hp: 1 } } };
      expect(issuesFor('material', paper as any)).toEqual([]);
    });

    it('rejects a base material with precious fields, and a precious one missing gear or grades', () => {
      // ajv reports an unknown root property and a missing root required property
      // on the record itself, naming the field in the message, not the instance path.
      expect(issuesFor('material', { ...base(), grades: precious().grades } as any).join('\n')).toContain('(grades)');
      const noGear = precious(); delete (noGear as any).gear;
      expect(issuesFor('material', noGear as any).join('\n')).toContain("must have required property 'gear'");
      const noGrades = precious(); delete (noGrades as any).grades;
      expect(issuesFor('material', noGrades as any).join('\n')).toContain("must have required property 'grades'");
      expect(issuesFor('material', { ...base(), level: 8 } as any).join('\n')).toContain('(level)');
    });

    it('rejects unknown thickness, grade and gear kind, a BT of 0, and a base record without exampleItems', () => {
      expect(issuesFor('material', { ...base(), hardness: { thick: base().hardness.thin } } as any).join('\n')).toContain('/hardness');
      expect(issuesFor('material', { ...precious(), grades: [{ grade: 'mid', level: 8, pricePerBulkCp: 1 }] } as any).join('\n')).toContain('/grades/0');
      const badKind = precious(); (badKind as any).gear['tower shield'] = (badKind as any).gear.weapon;
      expect(issuesFor('material', badKind as any).join('\n')).toContain('/gear');
      expect(issuesFor('material', { ...precious(), hardness: { thin: { standard: { hardness: 10, hp: 40, bt: 0 } } } } as any).join('\n')).toContain('/hardness');
      const noExamples = base(); delete (noExamples as any).exampleItems;
      expect(issuesFor('material', noExamples as any).join('\n')).toContain("must have required property 'exampleItems'");
    });
  });

});

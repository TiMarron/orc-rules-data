import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { creaturesCheck } from '../src/checks/creatures.js';
import { writeFixture, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

const creature = (over: Record<string, unknown>) => ({
  folder: 'creatures', file: 'creature.viper.json',
  json: record('creature', 'viper', {
    perception: { mod: 7 }, strikes: [],
    abilities: [{ id: 'venom', section: 'offense', name: 'creature.viper.abilities.venom.name' }],
    ...over,
  }),
});

const messages = (over: Record<string, unknown>, extra: { folder: string; file: string; json: unknown }[] = []): string[] =>
  creaturesCheck(loadDataset(writeFixture({ records: [creature(over), ...extra] }))).map((i) => i.message);

describe('creatures check', () => {
  it('accepts a Strike effect and a sense that name one of the creature\'s own abilities', () => {
    expect(messages({
      strikes: [{ effects: [{ own: 'venom' }] }],
      perception: { mod: 7, senses: [{ own: 'venom' }] },
    })).toEqual([]);
  });

  it('rejects a Strike effect naming an ability the creature does not have', () => {
    expect(messages({ strikes: [{ effects: [{ own: 'grabbing-trunk' }] }] })).toEqual([
      'strikes[0].effects[0].own: "grabbing-trunk" is not one of this creature\'s abilities',
    ]);
  });

  it('resolves an own inside a choice like any other own', () => {
    expect(messages({ strikes: [{ effects: [{ choice: [{ ability: 'ability.grab' }, { own: 'venom' }] }] }] })).toEqual([]);
    expect(messages({ strikes: [{ effects: [{ choice: [{ own: 'venom' }, { own: 'grabbing-trunk' }] }] }] })).toEqual([
      'strikes[0].effects[0].choice[1].own: "grabbing-trunk" is not one of this creature\'s abilities',
    ]);
  });

  it('rejects a sense naming an ability the creature does not have', () => {
    expect(messages({ perception: { mod: 7, senses: [{ own: 'web-sense' }] } })).toEqual([
      'perception.senses[0].own: "web-sense" is not one of this creature\'s abilities',
    ]);
  });

  it('accepts a weakness and a resistance that name one of the creature\'s own abilities', () => {
    expect(messages({
      weaknesses: [{ type: 'fire', value: 5 }, { own: 'venom' }],
      resistances: [{ own: 'venom' }],
    })).toEqual([]);
  });

  it('rejects a weakness or a resistance naming an ability the creature does not have', () => {
    expect(messages({
      weaknesses: [{ type: 'fire', value: 5 }, { own: 'x' }],
      resistances: [{ own: 'light-vulnerability' }],
    })).toEqual([
      'weaknesses[1].own: "x" is not one of this creature\'s abilities',
      'resistances[0].own: "light-vulnerability" is not one of this creature\'s abilities',
    ]);
  });

  it('rejects two abilities with one id', () => {
    const twice = [{ id: 'venom', section: 'offense', name: 'creature.viper.abilities.venom.name' }, { id: 'venom', section: 'defense', name: 'creature.viper.abilities.venom.name' }];
    expect(messages({ abilities: twice })).toEqual(['abilities: "venom" is listed twice']);
  });

  it('treats an entry that is an instance of a universal ability like any other: `own` can name it, and its id is unique', () => {
    const trample = { id: 'trample', section: 'offense', name: 'creature.viper.abilities.trample.name', ability: 'ability.trample', actions: '3' };
    expect(messages({ abilities: [trample], strikes: [{ effects: [{ own: 'trample' }] }] })).toEqual([]);
    expect(messages({ abilities: [trample, { ...trample, section: 'defense' }] })).toEqual(['abilities: "trample" is listed twice']);
  });

  it('rejects a size among the traits', () => {
    expect(messages({ traits: ['animal', 'large'] })).toEqual(['traits: "large" is a size and belongs in "size"']);
  });

  it('accepts trait parameters that belong to the same entry\'s own traits', () => {
    expect(messages({
      strikes: [{ traits: ['agile', 'reach'], traitValues: { reach: '10' } }],
      abilities: [{ id: 'venom', section: 'offense', name: 'creature.viper.abilities.venom.name', traits: ['aura'], traitValues: { aura: '20' } }],
    })).toEqual([]);
  });

  it('rejects a Strike\'s trait parameter for a trait the Strike does not have', () => {
    expect(messages({ strikes: [{ traits: ['agile'], traitValues: { reach: '10' } }] })).toEqual([
      'strikes[0].traitValues: "reach" is not among this Strike\'s traits',
    ]);
  });

  it('rejects an ability\'s trait parameter for a trait the ability does not have', () => {
    const abilities = [
      { id: 'venom', section: 'offense', name: 'creature.viper.abilities.venom.name' },
      { id: 'hiss', section: 'offense', name: 'creature.viper.abilities.hiss.name', traits: ['auditory'], traitValues: { aura: '20' } },
    ];
    expect(messages({ abilities })).toEqual(['abilities[1].traitValues: "aura" is not among this ability\'s traits']);
  });

  it('accepts a Strike made with one of the creature\'s items', () => {
    expect(messages({
      items: [{ item: 'item.dagger' }, { item: 'item.longsword', potency: 1 }],
      strikes: [{ item: 'item.longsword' }, { item: 'item.dagger' }, {}],
    })).toEqual([]);
  });

  it('rejects a Strike made with an item the creature does not carry, also when it carries nothing', () => {
    expect(messages({ items: [{ item: 'item.dagger' }], strikes: [{ item: 'item.longsword' }] })).toEqual([
      'strikes[0].item: "item.longsword" is not among this creature\'s items',
    ]);
    expect(messages({ strikes: [{}, { item: 'item.longsword' }] })).toEqual([
      'strikes[1].item: "item.longsword" is not among this creature\'s items',
    ]);
    expect(messages({ items: [{ name: 'creature.viper.items.0.name' }], strikes: [{ item: 'item.longsword' }] })).toEqual([
      'strikes[0].item: "item.longsword" is not among this creature\'s items',
    ]);
  });

  it('leaves a rune to the refs check: a rune, a graded rune (its own record) or a rune the dataset lacks raises nothing here', () => {
    const items = [{ item: 'item.longsword', potency: 2, runes: [{ item: 'item.striking-greater' }, { item: 'item.wounding' }] }];
    expect(messages({ items })).toEqual([]);
  });
});

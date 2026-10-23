import { describe, it, expect, afterAll } from 'vitest';
import { loadDataset } from '../src/load.js';
import { lightCheck } from '../src/checks/light.js';
import { writeFixture, record, cleanupFixtures } from './helpers.js';

afterAll(cleanupFixtures);

const TORCH = { folder: 'items', file: 'item.torch.json', json: record('item', 'torch', { light: { bright: 20, dim: 40, shape: 'radius', minutes: 60 } }) };
const ROPE = { folder: 'items', file: 'item.rope.json', json: record('item', 'rope') };
const SPRITE_LIGHT = { folder: 'items', file: 'item.lamp.json', json: record('item', 'lamp', { light: { as: 'item.torch' } }) };

const spell = (over: Record<string, unknown>) => ({ folder: 'spells', file: 'spell.glow.json', json: record('spell', 'glow', over) });
const creature = (ability: Record<string, unknown>) => ({
  folder: 'creatures', file: 'creature.wisp.json',
  json: record('creature', 'wisp', { abilities: [{ id: 'glow', section: 'defense', name: 'creature.wisp.abilities.glow.name', ...ability }] }),
});

const messages = (...records: { folder: string; file: string; json: unknown }[]): string[] =>
  lightCheck(loadDataset(writeFixture({ records }))).map((i) => i.message);

describe('light check', () => {
  it('rejects dim light that does not reach past the bright light', () => {
    expect(messages(spell({ light: { bright: 20, dim: 20, shape: 'radius' } }))).toEqual([
      'light: dim light (20 feet) must reach past the bright light (20 feet)',
    ]);
  });

  it('accepts a reference to a record that sheds its own light', () => {
    expect(messages(TORCH, spell({ light: { as: 'item.torch' } }))).toEqual([]);
  });

  it('rejects a reference to a record that sheds no light', () => {
    expect(messages(ROPE, spell({ light: { as: 'item.rope' } }))).toEqual([
      'light.as: item.rope sheds no light of its own',
    ]);
  });

  it('rejects a reference to a record whose light is itself a reference', () => {
    expect(messages(TORCH, SPRITE_LIGHT, spell({ light: { as: 'item.lamp' } }))).toEqual([
      'light.as: item.lamp sheds the light of another record; point at item.torch',
    ]);
  });

  it('checks heightened entries and activations too', () => {
    expect(messages(spell({ heightened: [{ level: '4', text: 'spell.glow.heightened.0', light: { bright: 60, dim: 50, shape: 'radius' } }] }))).toEqual([
      'heightened[0].light: dim light (50 feet) must reach past the bright light (60 feet)',
    ]);
    expect(messages({ folder: 'items', file: 'item.staff.json', json: record('item', 'staff', { activations: [{ light: { as: 'item.rope' } }] }) }, ROPE)).toEqual([
      'activations[0].light.as: item.rope sheds no light of its own',
    ]);
  });

  it('accepts an aura that sheds bright light in it, and one that sheds dim light in it', () => {
    expect(messages(creature({ aura: 60, light: { bright: 60, shape: 'emanation' } }))).toEqual([]);
    expect(messages(creature({ aura: 30, light: { bright: 0, dim: 30, shape: 'emanation' } }))).toEqual([]);
  });

  it('rejects an aura whose light does not fill it', () => {
    expect(messages(creature({ aura: 20, light: { bright: 30, shape: 'emanation' } }))).toEqual([
      'abilities[0].light: an aura of 20 feet sheds its light in the aura: bright 20, or bright 0 and dim 20',
    ]);
    expect(messages(creature({ aura: 30, light: { bright: 0, dim: 20, shape: 'emanation' } }))).toEqual([
      'abilities[0].light: an aura of 30 feet sheds its light in the aura: bright 30, or bright 0 and dim 30',
    ]);
  });

  it('rejects an aura whose light is not an emanation', () => {
    expect(messages(creature({ aura: 20, light: { bright: 20, shape: 'radius' } }))).toEqual([
      'abilities[0].light: an aura sheds light in an emanation, not a radius',
    ]);
  });

  it('accepts the light of an ability without an aura at any radius', () => {
    expect(messages(creature({ light: { bright: 20, dim: 40, shape: 'emanation' } }))).toEqual([]);
  });
});

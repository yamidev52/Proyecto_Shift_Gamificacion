/**
 * Casos de negocio sin servicios externos: XP, prerrequisitos, metas y pausas.
 * Las fechas son fijas para cubrir límites de semana de Ciudad de México.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProgress,
  canAccess,
  complete,
  redeem,
  freeze,
  weekKey,
  settleWeeks,
} from '../server/domain';
const monday = new Date('2026-09-14T18:00:00Z');
test('weekly boundary uses Mexico City, not UTC midnight', () => {
  assert.equal(weekKey(new Date('2026-09-21T02:00:00Z')), '2026-09-14');
  assert.equal(weekKey(new Date('2026-09-21T14:00:00Z')), '2026-09-21');
});
test('new users have no fabricated progress and cannot skip prerequisites', () => {
  const p = createProgress(false);
  assert.equal(p.xp, 0);
  assert.equal(p.completed.length, 0);
  assert.ok(canAccess(p, 'procesos-1'));
  assert.ok(!canAccess(p, 'procesos-2'));
  assert.throws(() => complete(p, 'procesos-2', 1));
});
test('completion requires starting, validates answer, awards once, unlocks next', () => {
  const p = createProgress(false);
  assert.throws(() => complete(p, 'procesos-1', 1));
  p.started.push('procesos-1');
  assert.throws(() => complete(p, 'procesos-1', 0));
  complete(p, 'procesos-1', 1, monday);
  complete(p, 'procesos-1', 1, monday);
  assert.equal(p.xp, 80);
  assert.equal(p.completed.length, 1);
  assert.ok(canAccess(p, 'procesos-2'));
  assert.equal(p.activity['2026-09-14'].days.length, 1);
});
test('three distinct days count as one weekly streak, multiple lessons per day do not', () => {
  const p = createProgress(false);
  for (let i = 1; i <= 4; i++) {
    p.started.push(`procesos-${i}`);
    complete(p, `procesos-${i}`, 1, new Date(`2026-09-${i === 4 ? '16' : 13 + i}T18:00:00Z`));
  }
  assert.equal(p.streak, 1);
  assert.equal(p.creditedWeeks?.length, 1);
});
test('changing goals cannot award the same weekly streak twice', () => {
  const p = createProgress(false);
  p.goal = 'minutes';
  p.activity['2026-09-14'] = { days: ['2026-09-14', '2026-09-15'], minutes: 55 };
  p.started.push('procesos-1');
  complete(p, 'procesos-1', 1, new Date('2026-09-15T18:00:00Z'));
  assert.equal(p.streak, 1);
  p.goal = 'days';
  p.started.push('procesos-2');
  complete(p, 'procesos-2', 1, new Date('2026-09-16T18:00:00Z'));
  assert.equal(p.streak, 1);
});
test('redemptions debit balance, increase inventory and enforce level and balance', () => {
  const p = createProgress();
  redeem(p, 'freeze');
  assert.equal(p.xp, 1200);
  assert.equal(p.freezes, 2);
  assert.equal(p.redemptions.length, 1);
  assert.throws(() => redeem(p, 'jobs'));
  p.xp = 0;
  assert.throws(() => redeem(p, 'freeze'));
  assert.throws(() => redeem(p, 'unknown'));
});
test('freeze applies once and protects a missed week; an unprotected missed week resets streak', () => {
  const p = createProgress();
  p.lastWeek = '2026-09-14';
  freeze(p, monday);
  assert.equal(p.freezes, 0);
  assert.throws(() => freeze(p, monday));
  settleWeeks(p, new Date('2026-09-21T18:00:00Z'));
  assert.equal(p.streak, 4);
  settleWeeks(p, new Date('2026-09-28T18:00:00Z'));
  assert.equal(p.streak, 0);
});

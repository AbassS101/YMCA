import { canManageTrainerAvailability, manageableTrainers } from '@/domain/availabilityAccess';
import type { Staff } from '@/domain/types';

const t = (id: string, staffRole: Staff['staffRole'], lessonTypes?: Staff['lessonTypes']) => ({ id, staffRole, lessonTypes });
const pt = t('pt', 'trainer', ['training']);
const swim = t('swim', 'swim_instructor', ['swim']);
const both = t('both', 'trainer', ['training', 'swim']);

describe('canManageTrainerAvailability', () => {
  it('lets admin, staff_admin and it_admin manage everyone', () => {
    for (const role of ['admin', 'staff_admin', 'it_admin']) {
      expect(canManageTrainerAvailability(role, 'boss', pt)).toBe(true);
      expect(canManageTrainerAvailability(role, 'boss', swim)).toBe(true);
    }
  });

  it('scopes directors to their department', () => {
    expect(canManageTrainerAvailability('wellness_director', 'w', pt)).toBe(true);
    expect(canManageTrainerAvailability('wellness_director', 'w', swim)).toBe(false);
    expect(canManageTrainerAvailability('wellness_director', 'w', both)).toBe(true);
    expect(canManageTrainerAvailability('aquatics_director', 'a', swim)).toBe(true);
    expect(canManageTrainerAvailability('aquatics_director', 'a', pt)).toBe(false);
    expect(canManageTrainerAvailability('aquatics_director', 'a', both)).toBe(true);
  });

  it('treats staff without lesson types as personal trainers', () => {
    expect(canManageTrainerAvailability('wellness_director', 'w', t('x', 'wellness_director'))).toBe(true);
    expect(canManageTrainerAvailability('aquatics_director', 'a', t('x', 'wellness_director'))).toBe(false);
  });

  it('lets a trainer manage only themselves', () => {
    expect(canManageTrainerAvailability('trainer', 'pt', pt)).toBe(true);
    expect(canManageTrainerAvailability('trainer', 'pt', both)).toBe(false);
    expect(canManageTrainerAvailability('swim_instructor', 'swim', swim)).toBe(true);
    expect(canManageTrainerAvailability('swim_instructor', 'swim', pt)).toBe(false);
  });

  it('denies desk and member roles, even for themselves', () => {
    expect(canManageTrainerAvailability('desk', 'pt', pt)).toBe(false);
    expect(canManageTrainerAvailability('membership_director', 'x', pt)).toBe(false);
    expect(canManageTrainerAvailability('member', 'x', pt)).toBe(false);
    expect(canManageTrainerAvailability(undefined, 'x', pt)).toBe(false);
  });
});

describe('manageableTrainers', () => {
  const all = [pt, swim, both, t('desk', 'desk')];
  it('filters to coaching staff the user can manage', () => {
    expect(manageableTrainers('admin', 'boss', all).map((s) => s.id)).toEqual(['pt', 'swim', 'both']);
    expect(manageableTrainers('wellness_director', 'w', all).map((s) => s.id)).toEqual(['pt', 'both']);
    expect(manageableTrainers('aquatics_director', 'a', all).map((s) => s.id)).toEqual(['swim', 'both']);
    expect(manageableTrainers('trainer', 'pt', all).map((s) => s.id)).toEqual(['pt']);
    expect(manageableTrainers('desk', 'desk', all)).toEqual([]);
  });
});

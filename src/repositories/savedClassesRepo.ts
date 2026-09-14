import type { SavedClass } from '@/domain/types';
import { loadStore, saveStore } from '@/storage/demoStore';

export const savedClassesRepo = {
  async list(memberId: string): Promise<SavedClass[]> {
    const state = await loadStore();
    return state.savedClasses.filter((s) => s.memberId === memberId);
  },

  async toggle(memberId: string, scheduleItemId: string): Promise<boolean> {
    const state = await loadStore();
    const idx = state.savedClasses.findIndex(
      (s) => s.memberId === memberId && s.scheduleItemId === scheduleItemId
    );
    if (idx === -1) {
      state.savedClasses.push({ memberId, scheduleItemId });
      await saveStore(state);
      return true;
    }
    state.savedClasses.splice(idx, 1);
    await saveStore(state);
    return false;
  },
};

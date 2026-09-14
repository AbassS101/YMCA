import type { ProtivityPort } from '@/protivity/ProtivityPort';
import type { UserRole } from '@/domain/types';

export const authRepo = {
  login(
    api: ProtivityPort,
    email: string,
    password: string
  ): Promise<{ userId: string; role: UserRole }> {
    return api.login(email, password);
  },
};

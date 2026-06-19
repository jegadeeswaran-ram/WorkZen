import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  tenantId: string | null;
  roles: string[];
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (accessToken: string, refreshToken: string, userId: string, tenantId: string, roles?: string[]) => void;
  clearAuth: () => void;
  setHasHydrated: (v: boolean) => void;
  setRoles: (roles: string[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      tenantId: null,
      roles: [],
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (accessToken, refreshToken, userId, tenantId, roles = []) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ accessToken, refreshToken, userId, tenantId, roles, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ accessToken: null, refreshToken: null, userId: null, tenantId: null, roles: [], isAuthenticated: false });
      },
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setRoles: (roles) => set({ roles }),
    }),
    {
      name: 'workzen-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useAuth = create(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'squadup-stage2-session' },
  ),
);

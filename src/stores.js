import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { me, initialSquads } from './data';
import { demo, configureAuth } from './lib/api';
export const useCapabilities = create(() => ({
  bioSource: 'template',
  storage: 'local',
  otp: false,
}));
export const useAuth = create(
  persist(
    (set) => ({
      user: demo ? me : null,
      token: null,
      ready: demo,
      login: (user, token) => {
        if (!demo && useAuth.getState().user?.id !== user.id)
          useChat.setState({ messages: {}, unread: {}, connections: [], activeRoom: null });
        set({ user, token, ready: true });
      },
      logout: () => {
        if (!demo) {
          useChat.setState({ messages: {}, unread: {}, connections: [], activeRoom: null });
          useSquad.setState({ squads: [] });
        }
        set({ user: null, token: null, ready: true });
      },
      update: (user) => set({ user }),
    }),
    {
      name: demo ? 'squadup-auth' : 'squadup-live-auth',
      partialize: (state) => (demo ? { user: state.user } : {}),
    },
  ),
);
export const useTheme = create(
  persist(
    (set) => ({
      theme: 'dark',
      toggle: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'squadup-theme' },
  ),
);
export const useSquad = create(
  persist(
    (set) => ({
      squads: demo ? initialSquads : [],
      setSquads: (squads) => set({ squads }),
      add: (squad) => set((s) => ({ squads: [squad, ...s.squads] })),
      join: (id, user) =>
        set((s) => ({
          squads: s.squads.map((q) =>
            q.id === id && q.members.length < 5 && !q.members.some((m) => m.id === user.id)
              ? { ...q, members: [...q.members, user] }
              : q,
          ),
        })),
    }),
    {
      name: demo ? 'squadup-demo-squads' : 'squadup-live-squads',
      partialize: (s) => (demo ? { squads: s.squads } : {}),
    },
  ),
);
export const useChat = create(
  persist(
    (set) => ({
      activeRoom: null,
      unread: demo ? { p1: 1 } : {},
      markRead: (room) => set((s) => ({ unread: { ...s.unread, [room]: 0 } })),
      incrementUnread: (room) =>
        set((s) => ({ unread: { ...s.unread, [room]: (s.unread[room] || 0) + 1 } })),
      messages: demo
        ? {
            p1: [
              {
                id: 'welcome',
                senderId: 'p1',
                content: 'Hey! Looking for an assaulter for tonight’s scrims. You in?',
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : {},
      connections: demo ? ['p1', 'p2'] : [],
      addConnection: (id) => set((s) => ({ connections: [...new Set([...s.connections, id])] })),
      addMessage: (room, message) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [room]: [...(s.messages[room] || []).filter((m) => m.id !== message.id), message],
          },
        })),
      setMessages: (room, messages) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [room]: [
              ...new Map(
                [...(s.messages[room] || []), ...messages].map((message) => [message.id, message]),
              ).values(),
            ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
          },
        })),
    }),
    {
      name: demo ? 'squadup-demo-chat' : 'squadup-live-chat',
      partialize: (s) =>
        demo ? { messages: s.messages, connections: s.connections, unread: s.unread } : {},
    },
  ),
);
configureAuth(
  () => useAuth.getState().token,
  () => useAuth.getState().logout(),
);

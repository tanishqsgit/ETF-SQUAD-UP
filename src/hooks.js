import { players } from './data';
import { useAuth } from './stores';
export function usePlayers() {
  const user = useAuth((s) => s.user);
  return {
    players: user && user.id !== 'me' ? [...players, user] : players,
    loading: false,
    error: '',
  };
}

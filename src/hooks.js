import { useEffect, useState } from 'react';
import { api, demo } from './lib/api';
import { players } from './data';
import { useSquad } from './stores';
export function usePlayers(filters = {}) {
  const [data, setData] = useState(demo ? players : []),
    [loading, setLoading] = useState(!demo),
    [error, setError] = useState('');
  const key = JSON.stringify(filters);
  useEffect(() => {
    if (demo) return;
    let current = true;
    setLoading(true);
    api
      .get('/players', { params: filters })
      .then(({ data }) => {
        if (current) {
          setData(data.players);
          setError('');
        }
      })
      .catch((error) => {
        if (current) setError(error.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [key]);
  return { players: data, loading, error };
}
export function useSquads() {
  const squads = useSquad((s) => s.squads),
    set = useSquad((s) => s.setSquads);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!demo)
      api
        .get('/squads')
        .then(({ data }) => set(data.squads))
        .catch((error) => setError(error.message));
  }, []);
  return { squads, error, refresh: () => api.get('/squads').then(({ data }) => set(data.squads)) };
}

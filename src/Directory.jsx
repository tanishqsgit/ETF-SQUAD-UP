import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiSliders, FiCrosshair, FiZap } from 'react-icons/fi';
import { DemoNotice, PageHeading, PlayerCard, Empty, label, useConnect } from './components';
import { useAuth } from './stores';
import { roles, slots, ranks, me } from './data';
import { compatibility } from './matching';
import { usePlayers } from './hooks';
export function Directory() {
  const [params, setParams] = useSearchParams(),
    [query, setQuery] = useState(params.get('q') || ''),
    [role, setRole] = useState(''),
    [rank, setRank] = useState(''),
    [device, setDevice] = useState(''),
    [times, setTimes] = useState([]),
    [game, setGame] = useState('Free Fire'),
    [online, setOnline] = useState(false),
    [sort, setSort] = useState('match'),
    [open, setOpen] = useState(false),
    [debounced, setDebounced] = useState(query);
  const user = useAuth((s) => s.user) || me;
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(id);
  }, [query]);
  const { players, loading, error } = usePlayers({
    q: debounced || undefined,
    role: role || undefined,
    rank: rank || undefined,
    device: device || undefined,
    game,
    online: online ? 'true' : undefined,
    time: times[0] || undefined,
  });
  const connect = useConnect();
  const filtered = players
    .filter(
      (p) =>
        (!query || `${p.displayName} ${p.playerId}`.toLowerCase().includes(query.toLowerCase())) &&
        (!role || p.role === role) &&
        (!rank || p.rank === rank) &&
        (!device || p.device === device) &&
        p.games.includes(game) &&
        (!online || p.status === 'online') &&
        (!times.length || times.every((t) => p.playingTime.includes(t))),
    )
    .sort((a, b) =>
      sort === 'kd'
        ? b.kdRatio - a.kdRatio
        : (b.compatibility?.score ?? compatibility(user, b).score) -
          (a.compatibility?.score ?? compatibility(user, a).score),
    );
  const reset = () => {
    setGame('Free Fire');
    setSort('match');
    setRole('');
    setRank('');
    setDevice('');
    setTimes([]);
    setOnline(false);
    setQuery('');
    setParams({});
  };
  return (
    <>
      <DemoNotice />
      <PageHeading
        eyebrow="YOUR NEXT TEAMMATE IS HERE"
        title="Find players"
        description="Less random matchmaking. More real chemistry."
      />
      <div className="directory-search">
        <FiSearch />
        <input
          aria-label="Search player name or ID"
          placeholder="Search by player name or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="button secondary mobile-filter" onClick={() => setOpen(!open)}>
          <FiSliders /> Filters
        </button>
      </div>
      <div className="directory-layout">
        <aside className={`filter-panel ${open ? 'show' : ''}`}>
          <div className="filter-heading">
            <h3>
              <FiSliders /> Filters
            </h3>
            <button onClick={reset}>Reset all</button>
          </div>
          <label>
            GAME
            <select value={game} onChange={(e) => setGame(e.target.value)}>
              {['Free Fire', 'BGMI', 'CODM'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>TACTICAL ROLE</legend>
            <div className="role-options">
              {roles.map((r) => (
                <button
                  className={role === r ? 'active' : ''}
                  key={r}
                  onClick={() => setRole(role === r ? '' : r)}
                >
                  <FiCrosshair />
                  {label(r)}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            RANK
            <select value={rank} onChange={(e) => setRank(e.target.value)}>
              <option value="">Any rank</option>
              {ranks.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>
              PLAYING HOURS <span>IST</span>
            </legend>
            {slots.map((time, i) => (
              <label className="checkbox-label" key={time}>
                <input
                  type="checkbox"
                  checked={times.includes(time)}
                  onChange={() =>
                    setTimes(
                      times.includes(time) ? times.filter((t) => t !== time) : [...times, time],
                    )
                  }
                />
                <span>
                  {label(time)}
                  <small>
                    {
                      [
                        '6 AM – 12 PM',
                        '12 PM – 5 PM',
                        '5 PM – 9 PM',
                        '9 PM – 12 AM',
                        '12 AM – 6 AM',
                      ][i]
                    }
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <label>
            DEVICE
            <select value={device} onChange={(e) => setDevice(e.target.value)}>
              <option value="">All devices</option>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={online} onChange={() => setOnline(!online)} />
            Online players only
          </label>
          <div className="filter-tip">
            <FiZap />
            <p>
              Your match score combines <b>role, schedule, rank, and age.</b>
            </p>
          </div>
        </aside>
        <section className="directory-results">
          <div className="result-heading">
            <p>
              <b>{filtered.length}</b> players match your vibe
            </p>
            <label>
              Sort by{' '}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="match">Best match</option>
                <option value="kd">Highest K/D</option>
              </select>
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          {loading ? (
            <Empty title="Finding your people..." />
          ) : filtered.length ? (
            <div className="player-grid directory-grid">
              {filtered.map((p) => (
                <PlayerCard key={p.id} player={p} onConnect={connect} />
              ))}
            </div>
          ) : (
            <Empty
              title="No players found"
              description="Try widening your filters or choosing another game."
            />
          )}
        </section>
      </div>
    </>
  );
}

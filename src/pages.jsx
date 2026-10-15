import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FiArrowRight,
  FiArrowUpRight,
  FiZap,
  FiCrosshair,
  FiUsers,
  FiMessageSquare,
  FiShield,
  FiSearch,
  FiSliders,
  FiChevronDown,
  FiPlus,
  FiClock,
  FiCheck,
  FiCopy,
  FiSend,
  FiImage,
  FiX,
  FiSmartphone,
  FiAward,
  FiLogOut,
  FiSun,
  FiMoon,
  FiArrowLeft,
  FiRefreshCw,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import {
  PlayerCard,
  SquadCard,
  PageHeading,
  Avatar,
  Modal,
  DemoNotice,
  Empty,
  label,
  useConnect,
} from './components';
import { useAuth, useSquad, useChat, useTheme } from './stores';
import { players as samplePlayers, roles, slots, ranks, me } from './data';
import { api, demo, connectSocket } from './lib/api';
import { usePlayers, useSquads } from './hooks';
import { compatibility } from '../server/services/matchingService';
import { rosterInsights } from '../shared/roster';
export { Chat } from './chat';
export { Auth, Profile, Settings } from './account';
export function Discovery({ landing }) {
  const { players, loading, error } = usePlayers(),
    { squads } = useSquads(),
    connect = useConnect(),
    [game, setGame] = useState('Free Fire');
  const matching = players.filter((p) => p.games?.includes(game));
  return (
    <>
      <DemoNotice />
      <div className="welcome-row">
        <div>
          <span className="eyebrow">THE NEXT LEVEL STARTS HERE</span>
          <h1>
            Your people. Your squad. <span>Your game.</span>
          </h1>
          <p>Good players win fights. Great teams win games.</p>
        </div>
        <span className="region-tag">
          🇮🇳 &nbsp; INDIA REGION <i />
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-label">
            <span /> SOLO QUEUE ENDS HERE
          </div>
          <h2>
            Find your squad.
            <br />
            <span>Dominate together.</span>
          </h2>
          <p>
            Same ambition. Same hours. The perfect roles.
            <br />
            Connect with players who play your game.
          </p>
          <div className="hero-actions">
            <Link to="/search" className="button primary">
              Find teammates <FiArrowUpRight />
            </Link>
            <Link to="/squad" className="button hero-secondary">
              <FiUsers /> Build a squad
            </Link>
          </div>
          <div className="hero-social">
            <div className="mini-avatars">
              {samplePlayers.slice(0, 3).map((p) => (
                <Avatar user={p} key={p.id} size={27} />
              ))}
            </div>
            <span>
              <b>{demo ? 'A new home' : 'Your home'}</b> for India's competitive players
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="radar-ring ring-one" />
          <div className="radar-ring ring-two" />
          <div className="radar-ring ring-three" />
          <div className="radar-line" />
          <div className="squad-mark">
            <FiCrosshair />
            <FiZap className="mark-zap" fill="currentColor" />
          </div>
          <div className="art-callout callout-one">
            <i /> SQUAD SYNERGY <b>98.6%</b>
          </div>
          <div className="art-callout callout-two">
            TEAM STATUS{' '}
            <b>
              <span /> READY TO DROP
            </b>
          </div>
          <span className="art-coordinate">28°36' N &nbsp; 77°12' E &nbsp; / &nbsp; INDIA</span>
          <div className="art-dot dot-one" />
          <div className="art-dot dot-two" />
        </div>
      </section>
      <div className="feature-strip">
        <div>
          <span>
            <FiCrosshair />
          </span>
          <div>
            <b>Find your fit</b>
            <p>Matched by role & playtime</p>
          </div>
        </div>
        <div>
          <span>
            <FiUsers />
          </span>
          <div>
            <b>Build your five</b>
            <p>Every role. One winning squad.</p>
          </div>
        </div>
        <div>
          <span>
            <FiMessageSquare />
          </span>
          <div>
            <b>Stay in sync</b>
            <p>Real-time comms, zero friction</p>
          </div>
        </div>
        <div>
          <span>
            <FiShield />
          </span>
          <div>
            <b>Play with confidence</b>
            <p>Safer, moderated conversations</p>
          </div>
        </div>
      </div>
      <div className="section-header">
        <div>
          <h2>
            Find your next teammate <span className="section-dot" />
          </h2>
          <p>Players ready to turn your next game into a win.</p>
        </div>
        <Link to="/search" className="text-link">
          View all players <FiArrowRight />
        </Link>
      </div>
      <div className="discovery-toolbar">
        <div className="game-tabs">
          {['Free Fire', 'BGMI', 'CODM'].map((g) => (
            <button className={game === g ? 'active' : ''} key={g} onClick={() => setGame(g)}>
              {g === 'Free Fire' ? <FiZap /> : <FiCrosshair />}
              {g}
            </button>
          ))}
        </div>
        <Link to="/search" className="filter-link">
          <FiSliders /> Fine-tune matches
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="empty">Finding players...</div>
      ) : matching.length ? (
        <div className="player-grid">
          {matching.slice(0, 4).map((player) => (
            <PlayerCard key={player.id} player={player} onConnect={connect} />
          ))}
        </div>
      ) : (
        <Empty
          title="Be the first to squad up"
          description={`No ${game} players yet. Try another game or complete your profile.`}
        />
      )}
      <div className="section-header">
        <div>
          <h2>
            A seat at the table <span className="tag new-tag">RECRUITING</span>
          </h2>
          <p>Find a squad with a spot that has your name on it.</p>
        </div>
        <Link to="/squad" className="text-link">
          Explore squads <FiArrowRight />
        </Link>
      </div>
      <div className="squad-grid">
        {squads.slice(0, 3).map((squad) => (
          <SquadCard key={squad.id} squad={squad} />
        ))}
      </div>
      <div className="community-banner">
        <div>
          <FiZap />
          <span>
            <b>Great chemistry beats great K/D.</b>
            <small>Find teammates who share your mindset, not just your rank.</small>
          </span>
        </div>
        <Link to="/search">
          Meet your match <FiArrowUpRight />
        </Link>
      </div>
    </>
  );
}
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
export function Squads() {
  const { squads, error } = useSquads(),
    [modal, setModal] = useState(false),
    [tab, setTab] = useState('all'),
    user = useAuth((s) => s.user);
  const visible =
    tab === 'mine' ? squads.filter((s) => s.members.some((p) => p.id === user.id)) : squads;
  return (
    <>
      <DemoNotice />
      <PageHeading
        eyebrow="FIVE PLAYERS. ONE PURPOSE."
        title="Squad hub"
        description="Find your home team, or build something from the ground up."
      >
        <button className="button primary" onClick={() => setModal(true)}>
          <FiPlus /> Create squad
        </button>
      </PageHeading>
      <div className="game-tabs squad-tabs">
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          Discover squads
        </button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          My squads
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="squad-grid">
        {visible.map((s) => (
          <SquadCard squad={s} key={s.id} />
        ))}
      </div>
      {!visible.length && (
        <Empty
          title="Your squad starts here"
          description="Create a squad or join a team that needs your role."
        />
      )}
      {modal && <CreateSquad onClose={() => setModal(false)} />}
    </>
  );
}
function CreateSquad({ onClose }) {
  const [name, setName] = useState(''),
    [description, setDescription] = useState(''),
    [role, setRole] = useState('sniper'),
    [game, setGame] = useState('Free Fire'),
    [isOpen, setOpen] = useState(true),
    [busy, setBusy] = useState(false),
    user = useAuth((s) => s.user),
    add = useSquad((s) => s.add),
    navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const input = { name, description, game, lookingForRole: role, isOpen };
      const squad = demo
        ? {
            ...input,
            id: crypto.randomUUID(),
            squadId: `${name.slice(0, 5).toUpperCase()}#${Math.floor(100 + Math.random() * 900)}`,
            leaderId: user.id,
            members: [user],
            color: '#00f0ff',
            symbol: name[0],
          }
        : (await api.post('/squads', input)).data.squad;
      if (
        demo &&
        useSquad.getState().squads.some((s) => s.name.toLowerCase() === name.toLowerCase())
      )
        throw new Error('That squad name is already taken.');
      add(squad);
      onClose();
      navigate(`/squad/${squad.id}`);
      toast.success('Your squad is ready. Let’s build your five.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Build your squad" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Squad name
          <input
            required
            minLength={3}
            maxLength={40}
            placeholder="e.g. Team Phoenix"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Your squad's story
          <textarea
            maxLength={500}
            placeholder="Your ambitions, schedule, and team culture..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Game
            <select value={game} onChange={(e) => setGame(e.target.value)}>
              {['Free Fire', 'BGMI', 'CODM'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label>
            Looking for
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {label(r)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={isOpen} onChange={() => setOpen(!isOpen)} />
          Allow players to join
        </label>
        <button disabled={busy} className="button primary">
          {busy ? 'Creating...' : 'Create squad'} <FiArrowUpRight />
        </button>
      </form>
    </Modal>
  );
}
export function SquadDetail() {
  const { id } = useParams(),
    { squads, refresh } = useSquads(),
    squad = squads.find((s) => s.id === id),
    user = useAuth((s) => s.user),
    join = useSquad((s) => s.join),
    [invite, setInvite] = useState(false),
    [analysis, setAnalysis] = useState(null),
    [busy, setBusy] = useState(false);
  if (!squad)
    return (
      <Empty title="Squad not found" description="Return to the squad hub to explore teams." />
    );
  const member = squad.members.some((m) => m.id === user.id);
  async function joinTeam() {
    setBusy(true);
    try {
      if (demo) join(id, user);
      else {
        await api.post(`/squads/${id}/join`);
        await refresh();
      }
      toast.success(
        demo
          ? 'Welcome to the squad!'
          : 'Join request sent. The squad leader can review it in Notifications.',
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function analyze() {
    setBusy(true);
    try {
      setAnalysis(
        demo
          ? { issues: rosterInsights(squad.members), source: 'rules' }
          : (await api.post(`/squads/${id}/analyze`)).data,
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DemoNotice />
      <Link className="back-link" to="/squad">
        <FiArrowLeft /> Squad hub
      </Link>
      <div className="squad-detail-head">
        <div className="squad-emblem large" style={{ '--squad-color': squad.color || '#00f0ff' }}>
          {squad.symbol || squad.name[0]}
        </div>
        <div>
          <span className="eyebrow">{squad.squadId}</span>
          <h1>{squad.name}</h1>
          <p>{squad.description}</p>
          <span className="role-tag">{squad.game}</span>{' '}
          <span className="recruiting">{squad.isOpen ? 'Open recruitment' : 'Invite only'}</span>
        </div>
      </div>
      <div className="section-header">
        <div>
          <h2>The starting five</h2>
          <p>Different strengths. Shared ambition.</p>
        </div>
        <span>{squad.members.length}/5 slots filled</span>
      </div>
      <div className="roster-grid">
        {Array.from({ length: 5 }).map((_, i) =>
          squad.members[i] ? (
            <Link to={`/profile/${squad.members[i].id}`} className="roster-slot filled" key={i}>
              <span className="roster-number">0{i + 1}</span>
              <Avatar user={squad.members[i]} size={78} />
              <h3>{squad.members[i].displayName}</h3>
              <span className="role-tag">{label(squad.members[i].role)}</span>
              <small>
                {squad.members[i].id === squad.leaderId ? '♛ Squad leader' : squad.members[i].rank}
              </small>
            </Link>
          ) : (
            <div className="roster-slot" key={i}>
              <span className="roster-number">0{i + 1}</span>
              <div className="open-slot-icon">
                <FiPlus />
              </div>
              <h3>Your next teammate</h3>
              <p>Looking for {label(squad.lookingForRole || 'allrounder')}</p>
              {squad.leaderId === user.id ? (
                <button className="text-link" onClick={() => setInvite(true)}>
                  Invite player <FiArrowUpRight />
                </button>
              ) : (
                <span className="muted">Open position</span>
              )}
            </div>
          ),
        )}
      </div>
      <div className="squad-actions">
        {member ? (
          <>
            <button className="button primary" onClick={analyze} disabled={busy}>
              <FiZap /> Analyze squad
            </button>
            <Link to={`/chat/squad-${id}`} className="button secondary">
              <FiMessageSquare /> Squad chat
            </Link>
            {squad.leaderId === user.id && (
              <button className="button secondary" onClick={() => setInvite(true)}>
                <FiPlus /> Invite players
              </button>
            )}
          </>
        ) : (
          <button
            className="button primary"
            disabled={busy || squad.members.length >= 5 || !squad.isOpen}
            onClick={joinTeam}
          >
            {squad.members.length >= 5
              ? 'Squad full'
              : !squad.isOpen
                ? 'Invite only'
                : demo
                  ? 'Join squad'
                  : 'Request to join'}{' '}
            <FiArrowUpRight />
          </button>
        )}
      </div>
      {analysis && (
        <section className="analysis-card">
          <span className="tiny-label">
            <FiZap /> {analysis.source === 'rules' ? 'TACTICAL ROSTER CHECK' : 'AI SQUAD ANALYSIS'}
          </span>
          <h2>Make every role count.</h2>
          {analysis.issues.map((issue) => (
            <p key={issue}>
              <FiCheck />
              {issue}
            </p>
          ))}
          {analysis.advice && <p>{analysis.advice}</p>}
        </section>
      )}
      {invite && <InviteModal squad={squad} onClose={() => setInvite(false)} />}
    </>
  );
}
function InviteModal({ squad, onClose }) {
  const [playerId, setPlayerId] = useState(''),
    [link, setLink] = useState(''),
    [expires, setExpires] = useState(''),
    [busy, setBusy] = useState(false),
    [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!expires) return;
    const update = () =>
      setSeconds(Math.max(0, Math.floor((new Date(expires) - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expires]);
  async function create(event) {
    event.preventDefault();
    setBusy(true);
    try {
      if (demo) {
        const code = crypto.randomUUID().slice(0, 6).toUpperCase();
        const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
        const invites = JSON.parse(localStorage.getItem('squadup-demo-invites') || '{}');
        invites[code] = {
          squadId: squad.id,
          expiresAt,
          playerId: playerId.toUpperCase(),
          status: 'pending',
        };
        localStorage.setItem('squadup-demo-invites', JSON.stringify(invites));
        setLink(`${location.origin}/invite/${code}`);
        setExpires(expiresAt);
      } else {
        const { data } = await api.post(
          `/squads/${squad.id}/invites`,
          playerId ? { playerId } : {},
        );
        setLink(data.url);
        setExpires(data.invite.expiresAt);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Invite your next teammate" onClose={onClose}>
      <form onSubmit={create} className="form-stack">
        <p className="muted">
          {demo
            ? 'Demo invitations work only in this browser.'
            : 'Send this seven-day link to your teammate.'}
        </p>
        <label>
          Player ID (optional)
          <input
            placeholder="SNIPER#9012"
            pattern="[A-Za-z0-9]+#[0-9]{4}"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? 'Generating...' : 'Generate invite link'}
          <FiArrowUpRight />
        </button>
        {link && (
          <div className="invite-link">
            <code>{link}</code>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                navigator.clipboard
                  .writeText(link)
                  .then(() => toast.success('Link copied'))
                  .catch(() => toast.error('Copy the link manually.'))
              }
            >
              <FiCopy /> Copy link
            </button>
            <small>
              <FiClock /> Expires in {Math.floor(seconds / 86400)}d{' '}
              {Math.floor((seconds % 86400) / 3600)}h {Math.floor((seconds % 3600) / 60)}m
            </small>
          </div>
        )}
      </form>
    </Modal>
  );
}
export function Invite() {
  const { code } = useParams(),
    user = useAuth((s) => s.user),
    join = useSquad((s) => s.join),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    try {
      if (demo) {
        const invites = JSON.parse(localStorage.getItem('squadup-demo-invites') || '{}'),
          invite = invites[code];
        if (!invite || invite.status !== 'pending' || new Date(invite.expiresAt) < new Date())
          throw new Error('Invite is unavailable or expired.');
        if (invite.playerId && invite.playerId !== user.playerId)
          throw new Error('This invite belongs to another player.');
        const squad = useSquad.getState().squads.find((s) => s.id === invite.squadId);
        if (!squad || squad.members.length >= 5) throw new Error('Squad unavailable or full.');
        if (squad.members.some((m) => m.id === user.id))
          throw new Error('You are already in this squad.');
        join(squad.id, user);
        invite.status = 'accepted';
        localStorage.setItem('squadup-demo-invites', JSON.stringify(invites));
        navigate(`/squad/${squad.id}`);
      } else {
        await api.post(`/invites/${code}/accept`);
        navigate('/squad');
      }
      toast.success('You’re in!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-card">
      <FiUsers className="auth-icon" />
      <h1>Your squad is calling.</h1>
      <p>You’ve been invited to team up. Ready to play?</p>
      <button className="button primary" disabled={busy} onClick={accept}>
        Accept invitation <FiArrowUpRight />
      </button>
    </div>
  );
}

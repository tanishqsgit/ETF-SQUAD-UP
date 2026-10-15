import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  FiGrid,
  FiSearch,
  FiUsers,
  FiMessageSquare,
  FiUser,
  FiSettings,
  FiChevronRight,
  FiArrowUpRight,
  FiSun,
  FiMoon,
  FiZap,
  FiCheck,
  FiClock,
  FiCrosshair,
  FiPlus,
  FiX,
  FiBell,
  FiLogOut,
  FiMenu,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth, useTheme, useChat } from './stores';
import { api, demo } from './lib/api';
import { compatibility } from '../server/services/matchingService';
import { me } from './data';
import { Inbox } from './Inbox';
export const label = (value) =>
  value === 'igl'
    ? 'IGL'
    : value === '5th'
      ? '5th man'
      : String(value || '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
export function Avatar({ user, size = 48 }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, '--avatar-color': user?.color || '#00f0ff' }}
    >
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={`${user.displayName} avatar`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <span>{user?.displayName?.slice(0, 2) || 'SU'}</span>
      <i
        className={`presence ${user?.status === 'online' ? 'online' : user?.status === 'in_game' ? 'gaming' : user?.status === 'lft' ? 'lft' : ''}`}
      />
    </div>
  );
}
export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-icon">
        <FiZap fill="currentColor" />
      </span>
      Squad<span>Up</span>
      <small>ESPORTS TEAM FINDER</small>
    </Link>
  );
}
const links = [
  ['/home', FiGrid, 'Discover'],
  ['/search', FiSearch, 'Find players'],
  ['/squad', FiUsers, 'Squad hub'],
  ['/chat', FiMessageSquare, 'Messages'],
];
export function Layout() {
  const unread = useChat((s) => Object.values(s.unread).reduce((sum, value) => sum + value, 0));
  const user = useAuth((s) => s.user),
    theme = useTheme((s) => s.theme),
    toggle = useTheme((s) => s.toggle),
    navigate = useNavigate(),
    logout = useAuth((s) => s.logout);
  const [search, setSearch] = useState(''),
    [notifications, setNotifications] = useState(false);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="side-caption">YOUR PLAYBOOK</div>
        <nav>
          {links.map(([path, Icon, name]) => (
            <NavLink key={path} to={path}>
              <Icon />
              {name}
              {name === 'Messages' && <span className="nav-count">{unread || ''}</span>}
            </NavLink>
          ))}
          <NavLink to={`/profile/${user?.id || 'me'}`}>
            <FiUser />
            My profile
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="grind-card">
            <span className="tiny-label">
              <FiZap /> MADE FOR THE GRIND
            </span>
            <h3>Better together.</h3>
            <p>Your next winning squad is one connection away.</p>
            <Link to="/search">
              Find your people <FiArrowUpRight />
            </Link>
          </div>
          <NavLink className="settings-link" to="/settings">
            <FiSettings /> Settings <FiChevronRight />
          </NavLink>
          {user ? (
            <Link to={`/profile/${user.id}`} className="sidebar-user">
              <Avatar user={user} size={38} />
              <div>
                <b>{user.displayName}</b>
                <small>
                  Level {user.level} · {label(user.role)}
                </small>
              </div>
              <FiChevronRight />
            </Link>
          ) : (
            <Link className="button primary" to="/login">
              Join the community
            </Link>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-logo">
            <Logo />
          </div>
          <div className="breadcrumb">
            Community <FiChevronRight />
            <b>Find your people</b>
          </div>
          <form
            className="header-search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/search?q=${encodeURIComponent(search)}`);
            }}
          >
            <FiSearch />
            <input
              aria-label="Search players and squads"
              placeholder="Search players, squads..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <kbd>/</kbd>
          </form>
          <div className="header-actions">
            <span className="live-pill">
              <i /> LET'S PLAY
            </span>
            <button
              className="icon-button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={toggle}
            >
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </button>
            <div className="notification-wrap">
              <button
                className="icon-button notification"
                aria-label="Notifications"
                onClick={() => setNotifications(!notifications)}
              >
                <FiBell />
                <i />
              </button>
              {notifications && (
                <div className="notification-panel">
                  <Inbox />
                </div>
              )}
            </div>
            <Link to={user ? `/profile/${user.id}` : '/login'}>
              <Avatar user={user || me} size={36} />
            </Link>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <footer className="footer">
          <span>BUILT FOR PLAYERS. POWERED BY TEAMWORK.</span>
          <span>
            SquadUp © 2026 <i /> India
          </span>
        </footer>
      </div>
      <nav className="mobile-nav">
        {links.map(([path, Icon, name]) => (
          <NavLink key={path} to={path}>
            <Icon />
            <span>
              {name === 'Find players' ? 'Players' : name === 'Squad hub' ? 'Squads' : name}
            </span>
          </NavLink>
        ))}
        <NavLink to={`/profile/${user?.id || 'me'}`}>
          <FiUser />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function PlayerCard({ player, onConnect }) {
  const user = useAuth((s) => s.user) || me;
  const connected = useChat((s) => s.connections.includes(player.id));
  const score = player.compatibility?.score ?? compatibility(user, player).score;
  return (
    <article className="player-card">
      <div className="player-cover" style={{ '--player-color': player.color || '#00f0ff' }}>
        <span className={`status-badge ${player.status}`}>
          ●{' '}
          {player.status === 'online'
            ? 'Online now'
            : player.status === 'lft'
              ? 'Looking for team'
              : player.status === 'in_game'
                ? 'In game'
                : 'Offline'}
        </span>
        <span className="game-tag">{player.games?.[0] || 'Free Fire'}</span>
        <div className="cover-grid" />
        <FiCrosshair className="cover-crosshair" />
      </div>
      <div className="player-body">
        <div className="player-ident">
          <Avatar user={player} size={57} />
          <span className="match-badge" title="40% role + 30% schedule + 20% rank + 10% age">
            <FiZap /> {score}% match
          </span>
        </div>
        <Link to={`/profile/${player.id}`} className="player-name">
          {player.displayName}
          {player.isVerified && (
            <span className="verified">
              <FiCheck />
            </span>
          )}
        </Link>
        <span className="player-id">{player.playerId}</span>
        <div className="player-tags">
          <span className={`role-tag ${player.role}`}>
            <FiCrosshair />
            {label(player.role)}
          </span>
          <span className="rank-tag">◇ {player.rank}</span>
        </div>
        <p className="player-bio">{player.bio}</p>
        <div className="player-stats">
          <div>
            <strong>{Number(player.kdRatio || 0).toFixed(2)}</strong>
            <span>K/D RATIO</span>
          </div>
          <div>
            <strong>
              {player.winRate || 0}
              <small>%</small>
            </strong>
            <span>WIN RATE</span>
          </div>
          <div>
            <strong>{Number(player.totalMatches || 0).toLocaleString('en-IN')}</strong>
            <span>MATCHES</span>
          </div>
        </div>
        <div className="play-hours">
          <FiClock />
          {player.playingTime?.includes('late_night')
            ? '9 PM – 2 AM'
            : player.playingTime?.includes('night')
              ? '7 PM – 12 AM'
              : label(player.playingTime?.[0])}
          <span>IST</span>
        </div>
        <button
          className={`button connect ${connected ? 'connected' : ''}`}
          onClick={() => onConnect(player)}
        >
          {connected ? <FiMessageSquare /> : <FiPlus />}
          {connected ? 'Message player' : 'Connect'}
          <FiArrowUpRight />
        </button>
      </div>
    </article>
  );
}
export function SquadCard({ squad }) {
  return (
    <Link to={`/squad/${squad.id}`} className="squad-card">
      <div className="squad-top">
        <div className="squad-emblem" style={{ '--squad-color': squad.color || '#00f0ff' }}>
          {squad.symbol || squad.name[0]}
        </div>
        <span className="recruiting">
          <i />
          {squad.isOpen ? 'Recruiting' : 'Invite only'}
        </span>
      </div>
      <h3>{squad.name}</h3>
      <p>
        {squad.game} <span>·</span> Competitive
      </p>
      <div className="squad-avatars">
        {squad.members.map((member) => (
          <Avatar user={member} size={32} key={member.id} />
        ))}
        {Array.from({ length: Math.max(0, 5 - squad.members.length) }).map((_, i) => (
          <span className="open-avatar" key={i}>
            <FiPlus />
          </span>
        ))}
        <small>{squad.members.length}/5 players</small>
      </div>
      <div className="squad-bottom">
        <span>
          Looking for <b>{label(squad.lookingForRole || 'teammates')}</b>
        </span>
        <FiArrowUpRight />
      </div>
    </Link>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const handler = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll('button,input,select,textarea,a[href]');
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <FiX />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function DemoNotice() {
  return demo ? (
    <div className="demo-notice">
      <span>
        <i /> DEMO PLAYGROUND
      </span>{' '}
      Explore with sample players. Changes stay on this device.
    </div>
  ) : null;
}
export function Empty({ title, description }) {
  return (
    <div className="empty">
      <FiSearch />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function useConnect() {
  const navigate = useNavigate(),
    add = useChat((s) => s.addConnection),
    user = useAuth((s) => s.user);
  return (player) => {
    if (!user) {
      navigate('/login');
      return;
    }
    add(player.id);
    navigate(`/chat/${player.id}`);
  };
}

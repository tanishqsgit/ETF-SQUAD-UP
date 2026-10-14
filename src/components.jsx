import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiCrosshair,
  FiZap,
  FiCheck,
  FiClock,
  FiArrowUpRight,
  FiUser,
  FiSearch,
} from 'react-icons/fi';
import { useAuth } from './stores';
import { me } from './data';
import { compatibility } from './matching';
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
        <button className="button connect" onClick={() => onConnect(player)}>
          <FiUser />
          View profile
          <FiArrowUpRight />
        </button>
      </div>
    </article>
  );
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

export function DemoNotice() {
  return (
    <div className="demo-notice">
      <span>
        <i />
        STAGE 2 DEMO
      </span>{' '}
      Fictional players. Registration stays in this browser. Use invented details and a throwaway
      password.
    </div>
  );
}
export function useConnect() {
  const navigate = useNavigate();
  return (player) => navigate('/profile/' + player.id);
}

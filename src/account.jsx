import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiArrowRight, FiZap } from 'react-icons/fi';
import { useAuth } from './stores';
import { players, me, roles, ranks, slots } from './data';
import { Avatar, DemoNotice, Empty, label } from './components';

const key = 'squadup-stage2-accounts';
const phoneOf = (value) => value.replace(/^\+91/, '');
const accounts = () => JSON.parse(localStorage.getItem(key) || '{}');
const initial = {
  phone: '',
  password: '',
  displayName: '',
  age: 18,
  bio: '',
  games: ['Free Fire'],
  role: 'rusher',
  rank: 'Heroic',
  playingTime: ['night'],
  device: 'android',
  deviceModel: '',
  instagramHandle: '',
  youtubeUrl: '',
  discordId: '',
};
async function digest(password, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
    material,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export function Auth({ register = false }) {
  const navigate = useNavigate(),
    login = useAuth((s) => s.login);
  const [form, setForm] = useState(initial),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    setStep(0);
    setError('');
  }, [register]);
  const set = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  function field(name, title, options = {}) {
    return (
      <label>
        {title}
        <input
          name={name}
          aria-label={title}
          value={form[name]}
          onChange={(event) => set(name, event.target.value)}
          {...options}
        />
      </label>
    );
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (register && step < 3) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const phone = phoneOf(form.phone),
        ledger = accounts();
      if (!/^[6-9]\d{9}$/.test(phone)) throw Error('Use a valid-format Indian demo phone number.');
      if (register) {
        if (ledger[phone]) throw Error('This demo number is already registered.');
        if (
          form.displayName.trim().length < 3 ||
          form.displayName.trim().length > 30 ||
          Number(form.age) < 13 ||
          Number(form.age) > 100 ||
          !form.playingTime.length ||
          form.password.length < 8 ||
          form.password.length > 72
        )
          throw Error('Check your profile, age, password and playing hours.');
        const salt = crypto.randomUUID(),
          passwordDigest = await digest(form.password, salt);
        const { password, ...profile } = form;
        const user = {
          ...profile,
          phone,
          age: Number(form.age),
          displayName: profile.displayName.trim(),
          id: crypto.randomUUID(),
          playerId: `${profile.role.toUpperCase()}#${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'lft',
          isVerified: false,
          level: 1,
          kdRatio: 0,
          winRate: 0,
          totalMatches: 0,
        };
        ledger[phone] = { user, salt, passwordDigest };
        localStorage.setItem(key, JSON.stringify(ledger));
        login(user);
      } else {
        const account = ledger[phone];
        if (!account || (await digest(form.password, account.salt)) !== account.passwordDigest)
          throw Error(
            'Incorrect demo phone or password. Register here first or explore the sample profile.',
          );
        login(account.user);
      }
      navigate('/profile/me');
      toast.success(register ? 'Local demo profile created' : 'Local demo signed in');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DemoNotice />
      <div className="auth-layout">
        <section className="auth-pitch">
          <span className="eyebrow">YOUR NEXT LEVEL STARTS HERE</span>
          <h1>
            Find your people.
            <br />
            <span>Play together.</span>
          </h1>
          <p>
            This is the Stage 2 frontend demo. No server account is created, no OTP is sent and no
            real players are contacted.
          </p>
        </section>
        <section className="auth-card">
          <span className="eyebrow">BROWSER-ONLY DEMO</span>
          <h1>{register ? 'Build your player identity' : 'Welcome back'}</h1>
          {register && (
            <p>
              Step {step + 1} of 4 ·{' '}
              {['Credentials', 'Profile', 'Playstyle', 'Device & socials'][step]}
            </p>
          )}
          <form className="auth-form" onSubmit={submit}>
            {(!register || step === 0) && (
              <>
                {field('phone', 'Demo phone', {
                  type: 'tel',
                  required: true,
                  pattern: '(\\+91)?[6-9][0-9]{9}',
                  autoComplete: 'off',
                })}
                {field('password', 'Throwaway password', {
                  type: 'password',
                  required: true,
                  minLength: register ? 8 : 1,
                  maxLength: 72,
                  autoComplete: 'off',
                })}
              </>
            )}
            {register && step === 1 && (
              <>
                {field('displayName', 'Display name', {
                  required: true,
                  minLength: 3,
                  maxLength: 30,
                })}
                {field('age', 'Age', { type: 'number', required: true, min: 13, max: 100 })}
                <label>
                  Your bio
                  <textarea
                    aria-label="Your bio"
                    value={form.bio}
                    maxLength={200}
                    onChange={(event) => set('bio', event.target.value)}
                  />
                </label>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() =>
                    set(
                      'bio',
                      `${label(form.role)} main. Clear comms, competitive ambition. Looking for teammates to grind, grow and win together.`,
                    )
                  }
                >
                  Generate sample bio <FiZap />
                </button>
              </>
            )}
            {register && step === 2 && (
              <>
                <label>
                  Game
                  <select
                    aria-label="Game"
                    value={form.games[0]}
                    onChange={(event) => set('games', [event.target.value])}
                  >
                    {['Free Fire', 'BGMI', 'CODM'].map((game) => (
                      <option key={game}>{game}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Tactical role
                  <select
                    aria-label="Tactical role"
                    value={form.role}
                    onChange={(event) => set('role', event.target.value)}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {label(role)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Rank
                  <select
                    aria-label="Rank"
                    value={form.rank}
                    onChange={(event) => set('rank', event.target.value)}
                  >
                    {ranks.map((rank) => (
                      <option key={rank}>{rank}</option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend>Playing hours (IST)</legend>
                  {slots.map((slot) => (
                    <label className="checkbox-label" key={slot}>
                      <input
                        type="checkbox"
                        checked={form.playingTime.includes(slot)}
                        onChange={() =>
                          set(
                            'playingTime',
                            form.playingTime.includes(slot)
                              ? form.playingTime.filter((time) => time !== slot)
                              : [...form.playingTime, slot],
                          )
                        }
                      />
                      {label(slot)}
                    </label>
                  ))}
                </fieldset>
                {!form.playingTime.length && (
                  <p className="error">Choose at least one playing slot.</p>
                )}
              </>
            )}
            {register && step === 3 && (
              <>
                <label>
                  Device
                  <select
                    aria-label="Device"
                    value={form.device}
                    onChange={(event) => set('device', event.target.value)}
                  >
                    <option value="android">Android</option>
                    <option value="ios">iOS</option>
                  </select>
                </label>
                {field('deviceModel', 'Device model', { maxLength: 80 })}
                {field('youtubeUrl', 'YouTube URL', {
                  type: 'url',
                  pattern: 'https://(www\\.)?(youtube\\.com|youtu\\.be)/.*',
                  maxLength: 250,
                })}
                {field('instagramHandle', 'Instagram handle', { maxLength: 30 })}
                {field('discordId', 'Discord ID', { maxLength: 80 })}
              </>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="form-actions">
              {register && step > 0 && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
              )}
              <button
                className="button primary"
                disabled={busy || (register && step === 2 && !form.playingTime.length)}
              >
                {busy
                  ? 'Saving...'
                  : register
                    ? step === 3
                      ? 'Create demo profile'
                      : 'Continue'
                    : 'Sign in locally'}{' '}
                <FiArrowRight />
              </button>
            </div>
          </form>
          <p>
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Already registered locally? Sign in' : 'Create a local demo profile'}
            </Link>
          </p>
          <button
            className="button secondary"
            onClick={() => {
              login(me);
              navigate('/home');
            }}
          >
            Explore sample profile
          </button>
        </section>
      </div>
    </>
  );
}
export function Profile() {
  const { id } = useParams(),
    user = useAuth((s) => s.user);
  const player = id === 'me' || id === user?.id ? user : players.find((player) => player.id === id);
  if (!player)
    return (
      <Empty
        title="Profile not found"
        description="Sign in locally or select a sample player from the directory."
      />
    );
  return (
    <>
      <DemoNotice />
      <Link className="back-link" to="/search">
        ← Player directory
      </Link>
      <div className="profile-banner" />
      <header className="profile-header">
        <Avatar user={player} size={90} />
        <div>
          <h1>{player.displayName}</h1>
          <p>
            {player.playerId} · Level {player.level || 1}
          </p>
          <span className={`role-tag ${player.role}`}>{label(player.role)}</span>{' '}
          <span className="rank-tag">◇ {player.rank}</span>
        </div>
      </header>
      <div className="profile-grid">
        <section>
          <div className="panel">
            <span className="eyebrow">THE PLAYER BEHIND THE NAME</span>
            <h2>About me</h2>
            <p>{player.bio || 'Ready to find a competitive team.'}</p>
          </div>
          <div className="panel">
            <h2>Seasonal stats</h2>
            <div className="player-stats">
              {[
                [Number(player.kdRatio || 0).toFixed(2), 'K/D'],
                [player.winRate || 0, 'WIN RATE %'],
                [player.totalMatches || 0, 'MATCHES'],
              ].map(([value, title]) => (
                <div key={title}>
                  <strong>{value}</strong>
                  <span>{title}</span>
                </div>
              ))}
            </div>
            <small>Fictional or locally entered statistics; not game-verified.</small>
          </div>
        </section>
        <aside>
          <div className="panel">
            <h3>Playing hours</h3>
            <p>{player.playingTime.map(label).join(' · ')}</p>
            <small>Indian Standard Time</small>
          </div>
          <div className="panel">
            <h3>The setup</h3>
            <p>
              {label(player.device)} · {player.deviceModel || 'Not specified'}
            </p>
            <p>{player.games.join(' · ')}</p>
            {player.youtubeUrl &&
              /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(player.youtubeUrl) && (
                <a href={player.youtubeUrl} target="_blank" rel="noreferrer">
                  YouTube ↗
                </a>
              )}
            {player.instagramHandle && <p>Instagram: {player.instagramHandle}</p>}
            {player.discordId && <p>Discord: {player.discordId}</p>}
          </div>
        </aside>
      </div>
    </>
  );
}

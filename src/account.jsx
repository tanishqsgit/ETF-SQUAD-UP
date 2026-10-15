import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FiZap,
  FiArrowUpRight,
  FiArrowLeft,
  FiCheck,
  FiSmartphone,
  FiClock,
  FiAward,
  FiEdit2,
  FiUsers,
  FiMessageSquare,
  FiSun,
  FiMoon,
  FiLogOut,
  FiDownload,
  FiShield,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Avatar, PageHeading, DemoNotice, Empty, Modal, label, useConnect } from './components';
import { useAuth, useSquad, useTheme, useCapabilities } from './stores';
import { api, demo } from './lib/api';
import { players, roles, slots, ranks, me } from './data';
import { ProfileEditor } from './ProfileEditor';
export function Auth({ register = false }) {
  const otpEnabled = useCapabilities((s) => s.otp);
  const location = useLocation();
  const requested = location.state?.from;
  const returnTo =
    typeof requested === 'string' &&
    requested.startsWith('/') &&
    !requested.startsWith('//') &&
    !requested.includes('\\')
      ? requested
      : '/home';
  const navigate = useNavigate(),
    login = useAuth((s) => s.login),
    [step, setStep] = useState(0),
    [mode, setMode] = useState('password'),
    [sent, setSent] = useState(false),
    [code, setCode] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [form, setForm] = useState({
      phone: '',
      password: '',
      displayName: '',
      bio: '',
      games: ['Free Fire'],
      role: 'rusher',
      rank: 'Heroic',
      playingTime: ['night'],
      age: 18,
      device: 'android',
      deviceModel: '',
      instagramHandle: '',
      youtubeUrl: '',
      discordId: '',
      kdRatio: 0,
      winRate: 0,
      totalMatches: 0,
    });
  const set = (field, value) => setForm((s) => ({ ...s, [field]: value }));
  useEffect(() => {
    setStep(0);
    setError('');
  }, [register]);
  async function generate() {
    setBusy(true);
    try {
      const bio = demo
        ? `${label(form.role)} main • ${form.rank} • ${form.kdRatio} K/D. Calm comms, competitive mindset. Looking for a squad to grind, grow and win together.`
        : (
            await api.post('/ai/bio', {
              displayName: form.displayName,
              role: form.role,
              rank: form.rank,
              kdRatio: Number(form.kdRatio),
            })
          ).data.bio;
      set('bio', bio.slice(0, 199));
      toast.success(demo ? 'Sample bio generated locally' : 'Bio generated');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
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
      if (demo) {
        const accounts = JSON.parse(localStorage.getItem('squadup-demo-accounts') || '{}');
        const phone = form.phone.replace(/^\+91/, '');
        if (register) {
          if (accounts[phone]) throw new Error('This demo phone is already registered.');
          const digest = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(form.password),
          );
          const passwordDigest = Array.from(new Uint8Array(digest), (n) =>
            n.toString(16).padStart(2, '0'),
          ).join('');
          const { password, ...safe } = form;
          const user = {
            ...safe,
            id: crypto.randomUUID(),
            playerId: `${form.role.toUpperCase()}#${Math.floor(1000 + Math.random() * 9000)}`,
            status: 'online',
            level: 1,
            isVerified: false,
          };
          accounts[phone] = { user, passwordDigest };
          localStorage.setItem('squadup-demo-accounts', JSON.stringify(accounts));
          login(user, null);
        } else {
          if (mode === 'otp')
            throw new Error('SMS OTP requires a connected provider. Use password or Explore demo.');
          const account = accounts[phone];
          const digest = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(form.password),
          );
          const passwordDigest = Array.from(new Uint8Array(digest), (n) =>
            n.toString(16).padStart(2, '0'),
          ).join('');
          if (!account || account.passwordDigest !== passwordDigest)
            throw new Error('Incorrect demo phone or password. Register or choose Explore demo.');
          login(account.user, null);
        }
      } else {
        const endpoint = register
          ? '/auth/register'
          : mode === 'otp'
            ? '/auth/otp/verify'
            : '/auth/login';
        const input = register
          ? form
          : mode === 'otp'
            ? { phone: form.phone, code }
            : { phone: form.phone, password: form.password };
        const { data } = await api.post(endpoint, input);
        login(data.user, data.token);
      }
      navigate(returnTo);
      toast.success(register ? 'Welcome to SquadUp!' : 'Welcome back!');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function sendOtp() {
    setBusy(true);
    try {
      if (demo)
        throw new Error('OTP needs Redis and an SMS provider. Password login works in demo mode.');
      await api.post('/auth/otp/request', { phone: form.phone });
      setSent(true);
      toast.success('OTP requested. Check your phone.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DemoNotice />
      <div className="auth-layout">
        <div className="auth-pitch">
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h1>
            Solo is a queue.
            <br />A squad is a <em>home.</em>
          </h1>
          <p>
            Find players who match your ambition, your role, and your hours. Build something worth
            logging in for.
          </p>
          <div>
            <FiCrosshairIcon /> Role-based matching
          </div>
          <div>
            <FiUsers /> Five-man squad builder
          </div>
          <div>
            <FiMessageSquare /> Real-time squad comms
          </div>
          <span className="auth-pitch-mark">
            <FiZap fill="currentColor" />
          </span>
        </div>
        <section className="auth-card">
          <div className="auth-heading">
            <span className="eyebrow">
              {register ? 'JOIN THE COMMUNITY' : 'WELCOME BACK, PLAYER'}
            </span>
            <h1>{register ? 'Make your first move.' : 'Ready to drop in?'}</h1>
            <p>
              {register
                ? 'Your team is out there. Let’s find them.'
                : 'Sign in and get back to your squad.'}
            </p>
          </div>
          {register ? (
            <>
              <div className="registration-steps">
                {['Account', 'Profile', 'Gameplay', 'Device'].map((name, i) => (
                  <span className={step >= i ? 'done' : ''} key={name}>
                    <b>{step > i ? <FiCheck /> : i + 1}</b>
                    <small>{name}</small>
                  </span>
                ))}
              </div>
              <span className="step-title">
                STEP {step + 1} / 4 ·{' '}
                {
                  ['YOUR CREDENTIALS', 'PLAYER IDENTITY', 'YOUR PLAYSTYLE', 'THE FINAL DETAILS'][
                    step
                  ]
                }
              </span>
            </>
          ) : (
            <div className="game-tabs auth-tabs">
              <button
                className={mode === 'password' ? 'active' : ''}
                onClick={() => {
                  setMode('password');
                  setError('');
                }}
              >
                Password
              </button>
              <button
                className={mode === 'otp' ? 'active' : ''}
                disabled={!otpEnabled && !demo}
                title={!otpEnabled ? 'Use password login in the free setup' : undefined}
                onClick={() => {
                  setMode('otp');
                  setError('');
                }}
              >
                Phone OTP
              </button>
            </div>
          )}
          <form className="form-stack" onSubmit={submit}>
            {(!register || step === 0) && (
              <>
                <label>
                  Mobile number
                  <div className="phone-input">
                    <span>🇮🇳 +91</span>
                    <input
                      required
                      type="tel"
                      pattern="[6-9][0-9]{9}"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                    />
                  </div>
                </label>
                {mode === 'password' || register ? (
                  <label>
                    Password
                    <input
                      required
                      type="password"
                      minLength={register ? 8 : 1}
                      maxLength={72}
                      autoComplete={register ? 'new-password' : 'current-password'}
                      placeholder={register ? 'At least 8 characters' : 'Your password'}
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                    />
                  </label>
                ) : (
                  <>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={sendOtp}
                      disabled={busy}
                    >
                      {sent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                    {sent && (
                      <label>
                        6-digit code
                        <input
                          required
                          pattern="[0-9]{6}"
                          inputMode="numeric"
                          maxLength={6}
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                        />
                      </label>
                    )}
                  </>
                )}
              </>
            )}
            {register && step === 1 && (
              <>
                <label>
                  Display name
                  <input
                    required
                    minLength={3}
                    maxLength={30}
                    placeholder="What should your squad call you?"
                    value={form.displayName}
                    onChange={(e) => set('displayName', e.target.value)}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Age
                    <input
                      type="number"
                      min={13}
                      max={100}
                      required
                      value={form.age}
                      onChange={(e) => set('age', Number(e.target.value))}
                    />
                  </label>
                  <label>
                    K/D ratio
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={form.kdRatio}
                      onChange={(e) => set('kdRatio', Number(e.target.value))}
                    />
                  </label>
                </div>
                <label>
                  Your bio
                  <textarea
                    maxLength={200}
                    placeholder="Your playstyle, ambitions, and what you're looking for..."
                    value={form.bio}
                    onChange={(e) => set('bio', e.target.value)}
                  />
                  <small>{form.bio.length}/200 characters</small>
                </label>
                {demo && (
                  <button
                    className="button secondary"
                    type="button"
                    disabled={busy}
                    onClick={generate}
                  >
                    <FiZap /> Generate sample bio
                  </button>
                )}
                {!demo && (
                  <small className="muted">
                    Bio generation is available on your profile after registration.
                  </small>
                )}
              </>
            )}
            {register && step === 2 && (
              <>
                <label>
                  Game
                  <select value={form.games[0]} onChange={(e) => set('games', [e.target.value])}>
                    {['Free Fire', 'BGMI', 'CODM'].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <div className="form-row">
                  <label>
                    Tactical role
                    <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {label(r)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Rank
                    <select value={form.rank} onChange={(e) => set('rank', e.target.value)}>
                      {ranks.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <fieldset>
                  <legend>WHEN DO YOU PLAY? (IST)</legend>
                  <div className="role-options">
                    {slots.map((slot) => (
                      <button
                        type="button"
                        className={form.playingTime.includes(slot) ? 'active' : ''}
                        key={slot}
                        onClick={() =>
                          set(
                            'playingTime',
                            form.playingTime.includes(slot)
                              ? form.playingTime.filter((t) => t !== slot)
                              : [...form.playingTime, slot],
                          )
                        }
                      >
                        {label(slot)}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {!form.playingTime.length && (
                  <p className="error">Select at least one playing slot.</p>
                )}
              </>
            )}
            {register && step === 3 && (
              <>
                <label>
                  Device
                  <select value={form.device} onChange={(e) => set('device', e.target.value)}>
                    <option value="android">Android</option>
                    <option value="ios">iOS</option>
                  </select>
                </label>
                <label>
                  Device model
                  <input
                    maxLength={80}
                    placeholder="e.g. iQOO Neo 7"
                    value={form.deviceModel}
                    onChange={(e) => set('deviceModel', e.target.value)}
                  />
                </label>
                <label>
                  Instagram handle (optional)
                  <input
                    maxLength={30}
                    placeholder="your.handle"
                    value={form.instagramHandle}
                    onChange={(e) => set('instagramHandle', e.target.value)}
                  />
                </label>
                <label>
                  YouTube URL (optional)
                  <input
                    type="url"
                    pattern="https://(www\.)?(youtube\.com|youtu\.be)/.*"
                    placeholder="https://youtube.com/@yourchannel"
                    value={form.youtubeUrl}
                    onChange={(e) => set('youtubeUrl', e.target.value)}
                  />
                </label>
                <label>
                  Discord ID (optional)
                  <input
                    maxLength={80}
                    value={form.discordId}
                    onChange={(e) => set('discordId', e.target.value)}
                  />
                </label>
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="form-buttons">
              {register && step > 0 && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setStep(step - 1)}
                >
                  <FiArrowLeft /> Back
                </button>
              )}
              <button
                className="button primary"
                disabled={
                  busy ||
                  (register && step === 2 && !form.playingTime.length) ||
                  (!register && mode === 'otp' && !sent)
                }
              >
                {busy
                  ? 'One moment...'
                  : register
                    ? step < 3
                      ? 'Continue'
                      : 'Create account'
                    : 'Sign in'}
                <FiArrowUpRight />
              </button>
            </div>
          </form>
          <p className="auth-switch">
            {register ? 'Already part of the squad?' : 'New to SquadUp?'}{' '}
            <Link to={register ? '/login' : '/register'} state={location.state}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          {demo && (
            <button
              className="text-link demo-login"
              onClick={() => {
                login(me, null);
                navigate(returnTo);
              }}
            >
              Explore demo <FiArrowRightIcon />
            </button>
          )}
          <p className="auth-fineprint">
            <FiShield /> Play fair. Be kind. You must be at least 13 to join.
          </p>
        </section>
      </div>
    </>
  );
}
function FiCrosshairIcon() {
  return <FiAward />;
}
function FiArrowRightIcon() {
  return <FiArrowUpRight />;
}
export function Profile() {
  const bioSource = useCapabilities((s) => s.bioSource);
  const [profileEditing, setProfileEditing] = useState(false);
  const { id } = useParams(),
    user = useAuth((s) => s.user),
    update = useAuth((s) => s.update),
    [player, setPlayer] = useState(
      id === user?.id ? user : demo ? players.find((p) => p.id === id) : null,
    ),
    [error, setError] = useState(''),
    [editing, setEditing] = useState(false),
    [bio, setBio] = useState(''),
    [busy, setBusy] = useState(false),
    [inviteSquad, setInviteSquad] = useState('');
  const squads = useSquad((s) => s.squads),
    connect = useConnect();
  const own = id === user?.id;
  useEffect(() => {
    if (own) setPlayer(user);
    else if (demo) setPlayer(players.find((p) => p.id === id));
    else
      api
        .get(`/players/${id}`)
        .then(({ data }) => setPlayer(data.user))
        .catch((e) => setError(e.message));
  }, [id, user]);
  if (error) return <Empty title="Could not load profile" description={error} />;
  if (!player)
    return (
      <Empty title="Player unavailable" description="Find another teammate in the directory." />
    );
  async function save() {
    setBusy(true);
    try {
      const next = demo ? { ...player, bio } : (await api.patch('/players/me', { bio })).data.user;
      update(next);
      setPlayer(next);
      setEditing(false);
      toast.success('Bio updated.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    try {
      setBio(
        demo
          ? `${label(player.role)} • ${player.rank} • ${player.kdRatio} K/D. Tactical mindset, clear comms, and a hunger to win. Looking for my next competitive squad.`
          : (
              await api.post('/ai/bio', {
                role: player.role,
                rank: player.rank,
                kdRatio: player.kdRatio,
                displayName: player.displayName,
              })
            ).data.bio,
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function invite() {
    try {
      if (!inviteSquad) throw new Error('Choose a squad first.');
      if (demo) {
        toast.success('Generate a player-specific invite from your squad hub.');
      } else {
        const { data } = await api.post(`/squads/${inviteSquad}/invites`, {
          playerId: player.playerId,
        });
        await navigator.clipboard.writeText(data.url);
        toast.success('Player invitation created. Link copied.');
      }
    } catch (e) {
      toast.error(e.message);
    }
  }
  const mySquads = squads.filter((s) => s.leaderId === user?.id && s.members.length < 5);
  return (
    <>
      <DemoNotice />
      <Link to="/search" className="back-link">
        <FiArrowLeft /> Player directory
      </Link>
      <div className="profile-banner">
        <div className="profile-banner-grid" />
        <span>PLAYER DOSSIER / {player.playerId}</span>
        <FiZap fill="currentColor" />
      </div>
      <div className="profile-heading">
        <Avatar user={player} size={108} />
        <div>
          <h1>
            {player.displayName}
            {player.isVerified && (
              <span className="verified">
                <FiCheck />
              </span>
            )}
          </h1>
          <p>
            {player.playerId} <span>·</span> Level {player.level || 1}
          </p>
          <div className="player-tags">
            <span className="role-tag">{label(player.role)}</span>
            <span className="rank-tag">◇ {player.rank}</span>
            <span className="game-tag">{player.games.join(' / ')}</span>
          </div>
        </div>
        {own ? (
          <>
            <button className="button secondary" onClick={() => setProfileEditing(true)}>
              <FiEdit2 /> Edit profile
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setBio(player.bio || '');
                setEditing(true);
              }}
            >
              <FiEdit2 /> Edit bio
            </button>
          </>
        ) : (
          <button className="button primary" onClick={() => connect(player)}>
            <FiMessageSquare /> Connect
          </button>
        )}
      </div>
      <div className="profile-layout">
        <div>
          <section className="detail-card">
            <span className="tiny-label">THE PLAYER BEHIND THE NAME</span>
            <h2>About me</h2>
            <p>{player.bio || 'Your story starts with your first game.'}</p>
            <div className="social-links">
              {player.youtubeUrl && (
                <a href={player.youtubeUrl} target="_blank" rel="noreferrer">
                  YouTube <FiArrowUpRight />
                </a>
              )}
              {player.instagramHandle && (
                <a
                  href={`https://instagram.com/${encodeURIComponent(player.instagramHandle.replace('@', ''))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram <FiArrowUpRight />
                </a>
              )}
              {player.discordId && <span>Discord: {player.discordId}</span>}
            </div>
          </section>
          <section className="detail-card">
            <span className="tiny-label">LET THE NUMBERS TALK</span>
            <h2>Seasonal stats</h2>
            <div className="profile-stats">
              {[
                [Number(player.kdRatio).toFixed(2), 'K/D RATIO'],
                [`${player.winRate}%`, 'WIN RATE'],
                [Number(player.totalMatches).toLocaleString('en-IN'), 'TOTAL MATCHES'],
              ].map(([value, name]) => (
                <div key={name}>
                  <strong>{value}</strong>
                  <span>{name}</span>
                </div>
              ))}
            </div>
            <small className="muted">Player-reported statistics</small>
          </section>
        </div>
        <div>
          <section className="detail-card">
            <h3>
              <FiClock /> Playing hours
            </h3>
            <div className="time-tags">
              {player.playingTime.map((t) => (
                <span className="tag" key={t}>
                  {label(t)}
                </span>
              ))}
            </div>
            <small>All times in Indian Standard Time</small>
            <h3>
              <FiSmartphone /> The setup
            </h3>
            <p>
              {label(player.device)} · {player.deviceModel || 'Device not added'}
            </p>
          </section>
          {!own && (
            <section className="detail-card invite-profile">
              <FiUsers />
              <h3>Complete your five.</h3>
              <p>A good fit for your squad? Make the first move.</p>
              <select
                aria-label="Select squad to invite player"
                value={inviteSquad}
                onChange={(e) => setInviteSquad(e.target.value)}
              >
                <option value="">Select your squad</option>
                {mySquads.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button className="button primary" onClick={invite}>
                Invite to squad <FiArrowUpRight />
              </button>
            </section>
          )}
        </div>
      </div>
      {editing && (
        <Modal title="Tell your story" onClose={() => setEditing(false)}>
          <div className="form-stack">
            <label>
              Your bio
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} />
              <small>{bio.length}/200 characters</small>
            </label>
            <button className="button secondary" onClick={generate} disabled={busy}>
              <FiZap />
              {demo
                ? 'Generate sample bio'
                : bioSource === 'template'
                  ? 'Generate template bio'
                  : 'Generate AI bio'}
            </button>
            <button className="button primary" onClick={save} disabled={busy}>
              Save bio <FiCheck />
            </button>
          </div>
        </Modal>
      )}
      {profileEditing && (
        <ProfileEditor
          player={player}
          onSave={(next) => {
            update(next);
            setPlayer(next);
          }}
          onClose={() => setProfileEditing(false)}
        />
      )}
    </>
  );
}
export function Settings() {
  const theme = useTheme((s) => s.theme),
    toggle = useTheme((s) => s.toggle),
    logout = useAuth((s) => s.logout),
    navigate = useNavigate(),
    [prompt, setPrompt] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title="Settings"
        description="Your game. Your environment."
      />
      <div className="settings-grid">
        <section className="detail-card">
          <h3>Appearance</h3>
          <p>Choose a theme that fits your hours.</p>
          <button className="button secondary" onClick={toggle}>
            {theme === 'dark' ? <FiSun /> : <FiMoon />} Switch to{' '}
            {theme === 'dark' ? 'light' : 'dark'} mode
          </button>
        </section>
        <section className="detail-card">
          <h3>Take SquadUp with you</h3>
          <p>Install the app for a focused, full-screen experience.</p>
          <button
            className="button secondary"
            disabled={!prompt}
            onClick={async () => {
              await prompt.prompt();
              setPrompt(null);
            }}
          >
            <FiDownload />
            {prompt ? 'Install SquadUp' : 'Use your browser’s Install app option'}
          </button>
        </section>
        <section className="detail-card">
          <h3>Session</h3>
          <p>
            {demo
              ? 'You’re exploring the local demo.'
              : 'Your account is connected to the SquadUp server.'}
          </p>
          <button
            className="button secondary"
            onClick={async () => {
              if (!demo) await api.post('/auth/logout').catch(() => {});
              logout();
              navigate('/login');
            }}
          >
            <FiLogOut /> Sign out
          </button>
        </section>
      </div>
    </>
  );
}

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCheck, FiZap } from 'react-icons/fi';
import { Modal, label } from './components';
import { api, demo } from './lib/api';
import { roles, ranks, slots } from './data';
import { useCapabilities } from './stores';

const textFields = [
  ['displayName', 'Display name', 30],
  ['deviceModel', 'Device model', 80],
  ['youtubeUrl', 'YouTube URL', 250],
  ['instagramHandle', 'Instagram handle', 30],
  ['discordId', 'Discord ID', 80],
];
export function ProfileEditor({ player, onSave, onClose }) {
  const bioSource = useCapabilities((s) => s.bioSource);
  const [draft, setDraft] = useState(() => ({
    displayName: player.displayName,
    bio: player.bio || '',
    age: player.age,
    games: [...player.games],
    role: player.role,
    rank: player.rank,
    playingTime: [...player.playingTime],
    device: player.device,
    deviceModel: player.deviceModel || '',
    youtubeUrl: player.youtubeUrl || '',
    instagramHandle: player.instagramHandle || '',
    discordId: player.discordId || '',
    kdRatio: player.kdRatio,
    winRate: player.winRate,
    totalMatches: player.totalMatches,
  }));
  const [busy, setBusy] = useState(false);
  const set = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const toggle = (field, value) =>
    set(
      field,
      draft[field].includes(value)
        ? draft[field].filter((v) => v !== value)
        : [...draft[field], value],
    );
  async function submit(event) {
    event.preventDefault();
    if (!draft.games.length || !draft.playingTime.length) {
      toast.error('Select at least one game and playing slot.');
      return;
    }
    setBusy(true);
    try {
      const next = demo
        ? { ...player, ...draft }
        : (await api.patch('/players/me', draft)).data.user;
      onSave(next);
      onClose();
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    try {
      const bio = demo
        ? `${label(draft.role)} • ${draft.rank} • ${draft.kdRatio} K/D. Tactical mindset and competitive ambitions.`
        : (
            await api.post('/ai/bio', {
              displayName: draft.displayName,
              role: draft.role,
              rank: draft.rank,
              kdRatio: draft.kdRatio,
            })
          ).data.bio;
      set('bio', bio);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Edit your player profile" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Display name
          <input
            required
            minLength={3}
            maxLength={30}
            value={draft.displayName}
            onChange={(e) => set('displayName', e.target.value)}
          />
        </label>
        <label>
          Bio
          <textarea
            maxLength={200}
            value={draft.bio}
            onChange={(e) => set('bio', e.target.value)}
          />
          <small>{draft.bio.length}/200 characters</small>
        </label>
        <button className="button secondary" type="button" disabled={busy} onClick={generate}>
          <FiZap />
          {demo
            ? 'Generate sample bio'
            : bioSource === 'template'
              ? 'Generate template bio'
              : 'Generate AI bio'}
        </button>
        <div className="form-row">
          <label>
            Age
            <input
              required
              type="number"
              min={13}
              max={100}
              value={draft.age}
              onChange={(e) => set('age', Number(e.target.value))}
            />
          </label>
          <label>
            Device
            <select value={draft.device} onChange={(e) => set('device', e.target.value)}>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Tactical role
            <select value={draft.role} onChange={(e) => set('role', e.target.value)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {label(r)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rank
            <select value={draft.rank} onChange={(e) => set('rank', e.target.value)}>
              {ranks.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
        <fieldset>
          <legend>GAMES</legend>
          <div className="role-options">
            {['Free Fire', 'BGMI', 'CODM'].map((game) => (
              <button
                key={game}
                type="button"
                className={draft.games.includes(game) ? 'active' : ''}
                onClick={() => toggle('games', game)}
              >
                {game}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>PLAYING HOURS (IST)</legend>
          <div className="role-options">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                className={draft.playingTime.includes(slot) ? 'active' : ''}
                onClick={() => toggle('playingTime', slot)}
              >
                {label(slot)}
              </button>
            ))}
          </div>
        </fieldset>
        {textFields.slice(1).map(([field, name, max]) => (
          <label key={field}>
            {name}
            <input
              type={field === 'youtubeUrl' ? 'url' : 'text'}
              maxLength={max}
              value={draft[field]}
              onChange={(e) => set(field, e.target.value)}
            />
          </label>
        ))}
        <div className="form-row">
          <label>
            K/D ratio
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              required
              value={draft.kdRatio}
              onChange={(e) => set('kdRatio', Number(e.target.value))}
            />
          </label>
          <label>
            Win rate (%)
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              required
              value={draft.winRate}
              onChange={(e) => set('winRate', Number(e.target.value))}
            />
          </label>
        </div>
        <label>
          Total matches
          <input
            type="number"
            min={0}
            max={1000000}
            required
            value={draft.totalMatches}
            onChange={(e) => set('totalMatches', Number(e.target.value))}
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? 'Saving...' : 'Save profile'}
          <FiCheck />
        </button>
      </form>
    </Modal>
  );
}

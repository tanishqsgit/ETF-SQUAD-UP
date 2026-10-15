import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { api, demo } from './lib/api';
import { useAuth, useSquad } from './stores';
import { label } from './components';

export function Inbox() {
  const user = useAuth((s) => s.user),
    setSquads = useSquad((s) => s.setSquads);
  const [data, setData] = useState({ invitations: [], requests: [], applications: [] }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function refresh() {
    if (demo || !user) return;
    try {
      setData((await api.get('/notifications')).data);
      setError('');
    } catch (error) {
      setError(error.message);
    }
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener('squadup-inbox', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('squadup-inbox', refresh);
    };
  }, [user?.id]);
  async function act(path, method = 'post', body) {
    setBusy(true);
    try {
      await api[method](path, body);
      await refresh();
      setSquads((await api.get('/squads')).data.squads);
      toast.success('Squad activity updated.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }
  if (demo)
    return (
      <>
        <b>Local demo notifications</b>
        <p>Live invitations and join requests appear here when connected to the server.</p>
      </>
    );
  if (!user) return <p>Sign in to see invitations and requests.</p>;
  return (
    <div className="inbox">
      <b>Squad activity</b>
      {error && <p className="error">{error}</p>}
      {data.invitations.map((invite) => (
        <article key={invite.id}>
          <b>{invite.squad.name}</b>
          <p>You’ve been invited to join.</p>
          <div>
            <button disabled={busy} onClick={() => act(`/invites/${invite.inviteCode}/accept`)}>
              Accept
            </button>
            <button disabled={busy} onClick={() => act(`/invites/${invite.id}/reject`)}>
              Decline
            </button>
          </div>
        </article>
      ))}
      {data.requests.map((request) => (
        <article key={request.id}>
          <b>
            {request.user.displayName} · {label(request.user.role)}
          </b>
          <p>Wants to join {request.squad.name}.</p>
          <div>
            <button
              disabled={busy}
              onClick={() => act(`/join-requests/${request.id}`, 'patch', { status: 'accepted' })}
            >
              Approve
            </button>
            <button
              disabled={busy}
              onClick={() => act(`/join-requests/${request.id}`, 'patch', { status: 'rejected' })}
            >
              Reject
            </button>
          </div>
        </article>
      ))}
      {data.applications.map((request) => (
        <article key={request.id}>
          <b>{request.squad.name}</b>
          <p>Your join request: {label(request.status)}</p>
        </article>
      ))}
      {!data.invitations.length && !data.requests.length && !data.applications.length && !error && (
        <p>You’re all caught up.</p>
      )}
    </div>
  );
}

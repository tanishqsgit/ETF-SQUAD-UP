import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiMessageSquare,
  FiSend,
  FiImage,
  FiArrowLeft,
  FiUsers,
  FiCheck,
  FiClock,
  FiSearch,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Avatar, DemoNotice, Empty } from './components';
import { useAuth, useChat, useSquad, useCapabilities } from './stores';
import { api, demo, connectSocket } from './lib/api';
import { players } from './data';
const emptyMessages = [];
function MessageImage({ message }) {
  const [url, setUrl] = useState(demo ? message.imageUrl : '');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true,
      blobUrl;
    if (!demo)
      api
        .get('/uploads/view', { params: { messageId: message.id } })
        .then(async ({ data }) => {
          if (data.source === 'local') {
            const response = await api.get(data.url, { responseType: 'blob' });
            if (active) {
              blobUrl = URL.createObjectURL(response.data);
              setUrl(blobUrl);
            }
          } else if (active) setUrl(data.url);
        })
        .catch(() => {
          if (active) setError('Screenshot unavailable.');
        });
    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [message.id]);
  return url ? (
    <a href={url} target="_blank" rel="noreferrer">
      <img className="chat-image" src={url} alt="Shared gameplay screenshot" />
    </a>
  ) : (
    <span>{error || 'Loading screenshot…'}</span>
  );
}
export function Chat() {
  const storage = useCapabilities((s) => s.storage);
  const [uploading, setUploading] = useState(false);
  const { id } = useParams(),
    navigate = useNavigate(),
    user = useAuth((s) => s.user),
    token = useAuth((s) => s.token),
    connections = useChat((s) => s.connections),
    unread = useChat((s) => s.unread),
    addConnection = useChat((s) => s.addConnection),
    messages = useChat((s) => s.messages[id] || emptyMessages),
    addMessage = useChat((s) => s.addMessage),
    setMessages = useChat((s) => s.setMessages),
    squads = useSquad((s) => s.squads);
  const [people, setPeople] = useState(demo ? players : []),
    [conversations, setConversations] = useState([]),
    [text, setText] = useState(''),
    [typing, setTyping] = useState(''),
    [busy, setBusy] = useState(false),
    [connected, setConnected] = useState(demo),
    [filter, setFilter] = useState(''),
    [error, setError] = useState('');
  const socket = useRef(null),
    end = useRef(),
    file = useRef(),
    typingTimer = useRef(),
    lastTyping = useRef(0);
  const isSquad = id?.startsWith('squad-'),
    squadId = isSquad ? id.slice(6) : null,
    squad = squads.find((s) => s.id === squadId),
    person = people.find((p) => p.id === id),
    roomName = isSquad ? squad?.name : person?.displayName,
    destination = isSquad ? { squadId } : { receiverId: id };
  useEffect(() => {
    if (demo) return;
    api
      .get('/conversations')
      .then(({ data }) => {
        setConversations(data.conversations);
        setPeople(data.conversations.map((c) => c.user));
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (demo || !id || isSquad) return;
    api
      .get(`/players/${id}`)
      .then(({ data }) => setPeople((s) => (s.some((p) => p.id === id) ? s : [...s, data.user])))
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => {
    if (!id) return;
    addConnection(id);
    if (demo) return;
    if (!token) return;
    setConnected(false);
    setError('');
    const client = connectSocket(token);
    socket.current = client;
    const join = () =>
      client.emit('join_room', destination, (response) => {
        if (response.success) {
          setConnected(true);
          api
            .get('/messages', { params: destination })
            .then(({ data }) => {
              setMessages(id, data.messages);
              client.emit('read_messages', destination);
            })
            .catch((e) => setError(e.message));
        } else setError(response.error);
      });
    client.on('connect', join);
    client.on('disconnect', () => setConnected(false));
    client.on('connect_error', () => setError('Chat connection unavailable. Reconnecting...'));
    const matches = (message) =>
      isSquad
        ? message.squadId === squadId
        : !message.squadId &&
          ((message.senderId === user.id && message.receiverId === id) ||
            (message.senderId === id && message.receiverId === user.id));
    const read = () => {
      if (document.visibilityState === 'visible') client.emit('read_messages', destination);
    };
    client.on('message', (message) => {
      if (!matches(message)) return;
      addMessage(id, message);
      if (message.senderId !== user.id) read();
    });
    client.on('read_receipt', (receipt) => {
      if (receipt.readerId === user.id) return;
      if (isSquad ? receipt.squadId !== squadId : receipt.squadId || receipt.readerId !== id)
        return;
      const current = useChat.getState().messages[id] || [];
      setMessages(
        id,
        current.map((message) =>
          message.senderId === user.id && new Date(message.createdAt) <= new Date(receipt.at)
            ? { ...message, isRead: true }
            : message,
        ),
      );
    });
    document.addEventListener('visibilitychange', read);
    client.on('typing', (data) => {
      if (isSquad ? data.squadId !== squadId : data.squadId || data.userId !== id) return;
      setTyping(data.isTyping ? `${data.displayName} is typing...` : '');
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(''), 2500);
    });
    client.on('presence', (data) =>
      setPeople((s) => s.map((p) => (p.id === data.userId ? { ...p, status: data.status } : p))),
    );
    return () => {
      client.disconnect();
      socket.current = null;
      document.removeEventListener('visibilitychange', read);
      clearTimeout(typingTimer.current);
    };
  }, [id, token]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, typing]);
  async function send(event, imageUrl) {
    event?.preventDefault();
    const content = imageUrl ? 'Gameplay screenshot' : text.trim();
    if (!content || busy || !id) return;
    if (!connected) {
      toast.error('Wait for chat to reconnect.');
      return;
    }
    setBusy(true);
    try {
      const input = {
        ...destination,
        content,
        ...(imageUrl ? { messageType: 'image', imageUrl } : {}),
      };
      if (demo) {
        if (/\b(kys|kill yourself)\b/i.test(content)) throw new Error('Keep comms respectful.');
        addMessage(id, {
          ...input,
          id: crypto.randomUUID(),
          senderId: user.id,
          createdAt: new Date().toISOString(),
          isRead: false,
        });
      } else {
        await new Promise((resolve, reject) =>
          socket.current
            .timeout(15000)
            .emit('send_message', input, (error, response) =>
              error
                ? reject(new Error('Message not confirmed. Check history before retrying.'))
                : response.success
                  ? (addMessage(id, response.message), resolve())
                  : reject(new Error(response.error)),
            ),
        );
      }
      setText('');
      socket.current?.emit('typing', { ...destination, isTyping: false });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(event) {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image) return;
    if (
      image.size > 5 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(image.type)
    ) {
      toast.error('Choose a JPG, PNG or WebP under 5 MB.');
      return;
    }
    if (uploading || busy) return;
    setUploading(true);
    try {
      let imageUrl;
      if (demo) {
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });
      } else if (storage === 'local') {
        const form = new FormData();
        form.append('image', image);
        imageUrl = (await api.post('/uploads/local', form)).data.imageUrl;
      } else {
        const { data } = await api.post('/uploads/presign', {
          contentType: image.type,
          size: image.size,
        });
        const response = await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': image.type },
          body: image,
        });
        if (!response.ok) throw new Error('Screenshot upload failed.');
        imageUrl = data.imageUrl;
      }
      await send(null, imageUrl);
    } catch (e) {
      toast.error(e.message || 'Unable to upload screenshot.');
    } finally {
      setUploading(false);
    }
  }
  const members = squads.filter((s) => s.members.some((m) => m.id === user.id));
  const conversationPeople = demo ? people.filter((p) => connections.includes(p.id)) : people;
  return (
    <>
      <DemoNotice />
      <div className={`chat-layout ${id ? 'active-room' : ''}`}>
        <aside className="conversation-panel">
          <h1>
            Messages <span>{conversationPeople.length}</span>
          </h1>
          <div className="chat-search">
            <FiSearch />
            <input
              aria-label="Filter conversations"
              placeholder="Find a conversation..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <span className="side-caption">DIRECT MESSAGES</span>
          {conversationPeople
            .filter((p) => p.displayName.toLowerCase().includes(filter.toLowerCase()))
            .map((p) => {
              const last = demo
                ? useChat.getState().messages[p.id]?.at(-1)
                : conversations.find((c) => c.user.id === p.id)?.lastMessage;
              return (
                <Link
                  className={`conversation ${id === p.id ? 'selected' : ''}`}
                  to={`/chat/${p.id}`}
                  key={p.id}
                >
                  <Avatar user={p} size={45} />
                  <div>
                    <b>{p.displayName}</b>
                    <p>{last?.content || 'Start the conversation'}</p>
                  </div>
                  <div className="conversation-meta">
                    {last?.createdAt && (
                      <small>
                        {new Date(last.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    )}
                    {!!unread[p.id] && <span className="unread-count">{unread[p.id]}</span>}
                  </div>
                </Link>
              );
            })}
          <span className="side-caption">SQUAD COMMS</span>
          {members.map((s) => (
            <Link
              className={`conversation ${squadId === s.id ? 'selected' : ''}`}
              key={s.id}
              to={`/chat/squad-${s.id}`}
            >
              <span className="squad-chat-icon">
                <FiUsers />
              </span>
              <div>
                <b>{s.name}</b>
                <p>{s.members.length} teammates</p>
              </div>
            </Link>
          ))}
          <div className="chat-note">
            <FiShieldIcon />
            <p>
              {demo
                ? 'Demo chat stores your messages locally. No messages are delivered to real players.'
                : 'Keep it tactical. Keep it respectful. Messages are moderated before delivery.'}
            </p>
          </div>
        </aside>
        <section className="chat-room">
          {id ? (
            <>
              <header className="chat-room-header">
                <Link
                  className="mobile-chat-back icon-button"
                  to="/chat"
                  aria-label="Back to conversations"
                >
                  <FiArrowLeft />
                </Link>
                {person ? (
                  <Avatar user={person} size={42} />
                ) : (
                  <span className="squad-chat-icon">
                    <FiUsers />
                  </span>
                )}
                <div>
                  <h3>{roomName || 'Conversation'}</h3>
                  <p>
                    <i className={connected ? 'connected-dot' : 'disconnected-dot'} />
                    {demo
                      ? 'Local demo conversation'
                      : connected
                        ? 'Connected · real-time comms'
                        : 'Connecting...'}
                  </p>
                </div>
                <Link
                  className="icon-button"
                  aria-label="View profile or squad"
                  to={isSquad ? `/squad/${squadId}` : `/profile/${id}`}
                >
                  <FiUsers />
                </Link>
              </header>
              {error && <div className="error">{error}</div>}
              <div className="message-history">
                <div className="chat-day">TODAY</div>
                <div className="chat-start">
                  <FiMessageSquare />
                  <p>
                    {demo
                      ? 'Try out your squad comms. These messages stay on your device.'
                      : 'This is the beginning of your conversation. Make the first play.'}
                  </p>
                </div>
                {messages.map((message) => (
                  <div
                    className={`message ${message.senderId === user.id ? 'own' : ''}`}
                    key={message.id}
                  >
                    {isSquad && message.senderId !== user.id && (
                      <b className="message-sender">{message.sender?.displayName || 'Teammate'}</b>
                    )}
                    <div className="message-bubble">
                      {message.messageType === 'image' ? (
                        <MessageImage message={message} />
                      ) : (
                        message.content
                      )}
                    </div>
                    <small>
                      {new Date(message.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      {message.senderId === user.id && (
                        <span
                          aria-label={message.isRead ? 'Read' : 'Sent'}
                          style={{ color: message.isRead ? 'var(--accent)' : undefined }}
                        >
                          {message.isRead ? '✓✓' : '✓'}
                        </span>
                      )}
                    </small>
                  </div>
                ))}
                {typing && <span className="typing-indicator">{typing}</span>}
                <div ref={end} />
              </div>
              <form className="message-composer" onSubmit={send}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  ref={file}
                  onChange={upload}
                />
                <button
                  type="button"
                  aria-label="Upload screenshot"
                  className="icon-button"
                  disabled={busy || uploading || !connected}
                  onClick={() => file.current.click()}
                >
                  <FiImage />
                </button>
                <input
                  aria-label="Message"
                  placeholder="Good comms win games. Say something..."
                  maxLength={2000}
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    if (Date.now() - lastTyping.current > 800) {
                      socket.current?.emit('typing', { ...destination, isTyping: true });
                      lastTyping.current = Date.now();
                    }
                  }}
                />
                <button
                  className="send-button"
                  aria-label="Send message"
                  disabled={busy || !text.trim() || !connected}
                >
                  <FiSend />
                </button>
              </form>
            </>
          ) : (
            <Empty
              title="Good comms start here."
              description="Select a teammate or squad to start talking."
            />
          )}
        </section>
      </div>
    </>
  );
}
function FiShieldIcon() {
  return <FiCheck />;
}

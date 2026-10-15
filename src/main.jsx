import React, { Component, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAuth, useTheme, useSquad, useCapabilities } from './stores';
import { api, demo } from './lib/api';
import { Layout } from './components';
import {
  Discovery,
  Directory,
  Squads,
  SquadDetail,
  Chat,
  Profile,
  Auth,
  Invite,
  Settings,
} from './pages';
import './styles.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/dm-sans/latin-800.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import { Notifications } from './notifications';
class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fatal">
        <h1>Let’s get you back in the game.</h1>
        <p>Something unexpected happened.</p>
        <button onClick={() => location.reload()}>Reload SquadUp</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Protected({ children }) {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const location = useLocation();
  if (!ready) return <div className="empty">Restoring your session...</div>;
  return user ? children : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}
function App() {
  const theme = useTheme((s) => s.theme),
    login = useAuth((s) => s.login),
    setSquads = useSquad((s) => s.setSquads);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content =
      theme === 'dark' ? '#060A13' : '#F8FAFC';
  }, [theme]);
  useEffect(() => {
    if (!demo)
      api
        .get('/capabilities')
        .then(({ data }) => useCapabilities.setState(data))
        .catch(() => {});
    if (!demo)
      api
        .get('/auth/me')
        .then(({ data }) => {
          login(data.user, data.token);
          return api.get('/squads');
        })
        .then(({ data }) => setSquads(data.squads))
        .catch(() => useAuth.setState({ ready: true }));
  }, []);
  return (
    <>
      <Notifications />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          },
        }}
      />
      {needRefresh && (
        <button className="update-banner" onClick={() => updateServiceWorker(true)}>
          New version available · Update
        </button>
      )}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Discovery landing />} />
          <Route
            path="/home"
            element={
              <Protected>
                <Discovery />
              </Protected>
            }
          />
          <Route
            path="/search"
            element={
              <Protected>
                <Directory />
              </Protected>
            }
          />
          <Route
            path="/squad"
            element={
              <Protected>
                <Squads />
              </Protected>
            }
          />
          <Route
            path="/squad/:id"
            element={
              <Protected>
                <SquadDetail />
              </Protected>
            }
          />
          <Route
            path="/chat"
            element={
              <Protected>
                <Chat />
              </Protected>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <Protected>
                <Chat />
              </Protected>
            }
          />
          <Route
            path="/profile/:id"
            element={
              <Protected>
                <Profile />
              </Protected>
            }
          />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/invite/:code"
            element={
              <Protected>
                <Invite />
              </Protected>
            }
          />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth register />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>Page not found</h1>
                <a href="/home">Back to discovery</a>
              </div>
            }
          />
        </Route>
      </Routes>
    </>
  );
}
const root = import.meta.hot?.data.root || createRoot(document.getElementById('root'));
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

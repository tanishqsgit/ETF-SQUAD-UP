import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FiZap, FiSun, FiMoon, FiUsers, FiSearch, FiUser, FiLogOut } from 'react-icons/fi';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useThemeStore } from './stores/themeStore';
import { useAuth } from './stores';
import { usePlayers } from './hooks';
import { DemoNotice, PlayerCard, PageHeading, useConnect } from './components';
import { Directory } from './Directory';
import { Auth, Profile } from './account';
function Logo() {
  return (
    <Link className="logo" to="/">
      <span className="logo-mark">
        <FiZap />
      </span>
      Squad<span>Up</span>
    </Link>
  );
}
function Layout() {
  const theme = useThemeStore((s) => s.theme),
    toggle = useThemeStore((s) => s.toggleTheme),
    user = useAuth((s) => s.user),
    logout = useAuth((s) => s.logout),
    navigate = useNavigate();
  const links = [
    ['/home', FiZap, 'Discover'],
    ['/search', FiUsers, 'Players'],
    ['/profile/me', FiUser, 'Profile'],
    ['/register', FiUser, 'Register'],
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <span className="side-caption">STAGE 2 · YOUR PLAYBOOK</span>
        <nav>
          {links.map(([path, Icon, title]) => (
            <NavLink key={path} to={path}>
              <Icon />
              {title}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>Frontend demo · no server accounts or messages</p>
          <Link className="button primary" to="/login">
            {user ? user.displayName : 'Sign in locally'}
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-logo">
            <Logo />
          </div>
          <b className="breadcrumb">Stage 2 · Find your people</b>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={toggle}
            >
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </button>
            {user && (
              <button
                className="icon-button"
                aria-label="Sign out locally"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <FiLogOut />
              </button>
            )}
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <footer className="footer">SQUADUP · STAGE 2 FRONTEND DEMO · INDIA</footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(([path, Icon, title]) => (
          <NavLink key={path} to={path}>
            <Icon />
            <span>{title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
function Discovery() {
  const { players } = usePlayers(),
    view = useConnect();
  return (
    <>
      <DemoNotice />
      <PageHeading
        eyebrow="THE NEXT LEVEL STARTS HERE"
        title="Your people. Your game."
        description="Discover fictional players and try the role-based directory."
      />
      <section className="hero">
        <span className="eyebrow">SOLO QUEUE ENDS HERE</span>
        <h1>
          Find your squad.
          <br />
          <span>Dominate together.</span>
        </h1>
        <p>
          Same ambition. Same hours. The perfect roles.
          <br />
          Explore the Stage 2 player discovery frontend.
        </p>
        <div className="hero-actions">
          <Link className="button primary" to="/search">
            <FiSearch />
            Find teammates
          </Link>
          <Link className="button secondary" to="/register">
            Create demo profile
          </Link>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <h2>Find your next teammate</h2>
          <p>Sample players ready for the next game.</p>
        </div>
        <Link className="text-link" to="/search">
          View all players →
        </Link>
      </div>
      <div className="player-grid">
        {players.slice(0, 3).map((player) => (
          <PlayerCard key={player.id} player={player} onConnect={view} />
        ))}
      </div>
    </>
  );
}
function Content() {
  const theme = useThemeStore((s) => s.theme);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content =
      theme === 'dark' ? '#060A13' : '#F8FAFC';
  }, [theme]);
  return (
    <>
      <Toaster />
      {needRefresh && (
        <button className="update-banner" onClick={() => updateServiceWorker(true)}>
          New version available · Update
        </button>
      )}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Discovery />} />
          <Route path="/home" element={<Discovery />} />
          <Route path="/search" element={<Directory />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth register />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>Page not found</h1>
                <Link to="/home">Back to discovery</Link>
              </div>
            }
          />
        </Route>
      </Routes>
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Content />
    </BrowserRouter>
  );
}

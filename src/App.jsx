import { useEffect } from 'react';
import { FiCrosshair, FiMoon, FiShield, FiSun, FiUsers, FiZap } from 'react-icons/fi';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useThemeStore } from './stores/themeStore';

const features = [
  {
    Icon: FiCrosshair,
    title: 'Find your fit',
    detail: 'Teammates matched by tactical role and playing hours.',
  },
  {
    Icon: FiUsers,
    title: 'Build your five',
    detail: 'Different strengths. One competitive squad.',
  },
  {
    Icon: FiShield,
    title: 'Play with confidence',
    detail: 'A community built around clear, respectful comms.',
  },
];

export default function App() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
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
    <div className="app-shell">
      <header className="site-header">
        <a className="logo" href={import.meta.env.BASE_URL} aria-label="SquadUp home">
          <span className="logo-mark">
            <FiZap fill="currentColor" />
          </span>
          Squad<span className="accent">Up</span>
        </a>
        <button
          className="theme-button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>
      </header>
      <main>
        <section className="hero">
          <span className="eyebrow">ESPORTS TEAM FINDER · INDIA</span>
          <h1>
            Find your squad.
            <br />
            <span>Dominate together.</span>
          </h1>
          <p>
            Same ambition. Same hours. The perfect roles.
            <br />A new home for competitive mobile gamers.
          </p>
          <span className="release-badge">
            <i /> FOUNDATION RELEASE
          </span>
          <div className="hero-symbol" aria-hidden="true">
            <FiCrosshair />
            <FiZap fill="currentColor" />
          </div>
        </section>
        <section className="feature-grid" aria-label="Project direction">
          {features.map(({ Icon, title, detail }) => (
            <article className="feature-card" key={title}>
              <Icon />
              <h2>{title}</h2>
              <p>{detail}</p>
            </article>
          ))}
        </section>
        <section className="release-note">
          <span className="eyebrow">STAGE 1 OF THE SOURCE RELEASE</span>
          <h2>The foundation is ready.</h2>
          <p>
            This release includes the React/Vite starter, theme system, Tailwind styling, and PWA
            configuration. Player discovery, squads, authentication, and chat will be published in
            subsequent stages.
          </p>
        </section>
      </main>
      <footer>BUILT FOR PLAYERS. POWERED BY TEAMWORK.</footer>
      {needRefresh && (
        <button className="update-button" onClick={() => updateServiceWorker(true)}>
          New version available · Update
        </button>
      )}
    </div>
  );
}

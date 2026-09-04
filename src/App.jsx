import { useState, useCallback, useRef } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';
const FRONTEND_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const BUILD_TIME = __BUILD_TIME__;

const ENDPOINTS = [
  { path: '/', label: 'kök' },
  { path: '/api/health', label: 'sağlık' },
  { path: '/api/info', label: 'bilgi' },
];

function timestamp() {
  return new Date().toLocaleTimeString('tr-TR', { hour12: false });
}

function App() {
  const [entries, setEntries] = useState([]);
  const [pending, setPending] = useState(null);
  const [connection, setConnection] = useState('unknown'); // unknown | up | down
  const logRef = useRef(null);

  const callEndpoint = useCallback(async (path) => {
    setPending(path);
    const startedAt = performance.now();
    try {
      const res = await fetch(`${API_URL}${path}`);
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await res.json().catch(() => null);

      setEntries((prev) => [
        {
          id: crypto.randomUUID(),
          time: timestamp(),
          path,
          status: res.status,
          ok: res.ok,
          durationMs,
          body,
        },
        ...prev,
      ]);
      setConnection(res.ok ? 'up' : 'down');
    } catch (err) {
      setEntries((prev) => [
        {
          id: crypto.randomUUID(),
          time: timestamp(),
          path,
          status: null,
          ok: false,
          durationMs: Math.round(performance.now() - startedAt),
          body: { error: err.message },
        },
        ...prev,
      ]);
      setConnection('down');
    } finally {
      setPending(null);
    }
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-id">
          <span className="topbar-dot" data-state={connection} />
          devops-frontend
        </div>
        <div className="topbar-meta">
          <span>v{FRONTEND_VERSION}</span>
          <span className="topbar-sep">·</span>
          <span title={BUILD_TIME}>derleme {BUILD_TIME}</span>
        </div>
      </header>

      <main className="layout">
        <section className="hero">
          <p className="eyebrow">backend bağlantı konsolu</p>
          <h1>
            Backend'in ayakta olduğunu
            <br />
            burada doğrula.
          </h1>
          <p className="hero-copy">
            Aşağıdaki uçlardan birine istek gönder, gelen cevabı ve gecikmeyi
            anında gör. Frontend ile backend arasındaki bağlantıyı test etmenin
            en basit yolu.
          </p>
          <p className="hero-target">
            hedef <span>{API_URL}</span>
          </p>
        </section>

        <section className="console">
          <div className="console-controls">
            {ENDPOINTS.map((ep) => (
              <button
                key={ep.path}
                className="btn"
                onClick={() => callEndpoint(ep.path)}
                disabled={pending !== null}
              >
                {pending === ep.path ? 'gönderiliyor…' : `GET ${ep.path}`}
              </button>
            ))}
          </div>

          <div className="console-log" ref={logRef}>
            {entries.length === 0 && (
              <p className="console-empty">
                Henüz istek gönderilmedi. Yukarıdan bir uç seç.
              </p>
            )}
            {entries.map((entry) => (
              <article key={entry.id} className="log-entry" data-ok={entry.ok}>
                <div className="log-entry-head">
                  <span className="log-time">{entry.time}</span>
                  <span className="log-path">GET {entry.path}</span>
                  <span className="log-status">
                    {entry.status ?? 'ERR'} · {entry.durationMs}ms
                  </span>
                </div>
                <pre className="log-body">
                  {JSON.stringify(entry.body, null, 2)}
                </pre>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>devops-frontend</span>
        <span className="footer-sep">·</span>
        <span>sürüm {FRONTEND_VERSION}</span>
        <span className="footer-sep">·</span>
        <span>son güncelleme {BUILD_TIME}</span>
      </footer>
    </div>
  );
}

export default App;

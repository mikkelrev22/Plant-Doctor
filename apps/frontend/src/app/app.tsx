import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';

import { checkBackendPyHealth } from '../api/backend-py';
import { config } from '../config';
import { AgentChatPage } from './agent-chat';
import { LinearDiagnosisPage } from './linear-diagnosis';

export function App() {
  const [backendStatus, setBackendStatus] = useState('Checking Python backend...');

  useEffect(() => {
    checkBackendPyHealth()
      .then((message) => setBackendStatus(message))
      .catch(() => setBackendStatus('Python backend unavailable'));
  }, []);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div>
          <p className="eyebrow">Plant Doctor</p>
          <h1>Diagnose your houseplants</h1>
        </div>
        <p className="meta">
          Python API: {config.backendPyUrl} · {backendStatus}
        </p>
      </header>

      <nav className="site-nav" aria-label="Main">
        <Link to="/">Home</Link>
        <Link to="/diagnose">Linear diagnosis</Link>
        <Link to="/agent">Agent chat</Link>
      </nav>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <section className="page">
                <div className="card hero-card">
                  <h2>Choose a workflow</h2>
                  <p>
                    Compare the deterministic pipeline against the ReAct agent on
                    the same plant-care task.
                  </p>
                  <div className="hero-actions">
                    <Link className="button-link" to="/diagnose">
                      Run linear diagnosis
                    </Link>
                    <Link className="button-link secondary" to="/agent">
                      Chat with agent
                    </Link>
                  </div>
                </div>
              </section>
            }
          />
          <Route path="/diagnose" element={<LinearDiagnosisPage />} />
          <Route path="/agent" element={<AgentChatPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

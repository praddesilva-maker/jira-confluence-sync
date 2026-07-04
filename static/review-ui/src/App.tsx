import { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

interface PingResponse {
  message: string;
  timestamp: string;
}

export function App() {
  const [ping, setPing] = useState<PingResponse | 'loading' | 'error'>('loading');

  useEffect(() => {
    invoke<PingResponse>('ping')
      .then(setPing)
      .catch(() => setPing('error'));
  }, []);

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1>Initiative Sync — Phase 0</h1>
      {ping === 'loading' && <p>Calling ping()…</p>}
      {ping === 'error' && <p>ping() failed.</p>}
      {typeof ping === 'object' && (
        <p>
          {ping.message} (at {ping.timestamp})
        </p>
      )}
    </div>
  );
}

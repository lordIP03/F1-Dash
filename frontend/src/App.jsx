import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

function normalizePoints(drivers, width, height, track) {
  if (!track || !track.bounds) return drivers.map(d => ({ ...d, px: -999, py: -999 }));

  if (track.isDynamic) {
    return drivers.map(d => ({
      ...d,
      px: d.x !== 0 ? d.x : -999,
      py: d.x !== 0 ? -d.y : -999
    }));
  }

  // Hand-drawn tracks fallback
  const withCoords = drivers.filter((d) => d.x !== 0 || d.y !== 0);
  if (withCoords.length < 2) {
    return drivers.map((d, index) => {
      const angle = (index / Math.max(drivers.length, 1)) * Math.PI * 2;
      return {
        ...d,
        px: width / 2 + Math.cos(angle) * (width * 0.28),
        py: height / 2 + Math.sin(angle) * (height * 0.28)
      };
    });
  }

  const { minX, maxX, minY, maxY } = track.bounds;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const padding = 20;

  return drivers.map((d) => {
    const px = d.x !== 0 ? padding + ((d.x - minX) / spanX) * (width - padding * 2) : -999;
    const py = d.y !== 0 ? padding + ((d.y - minY) / spanY) * (height - padding * 2) : -999;
    return { ...d, px, py };
  });
}

export default function App() {
  const [drivers, setDrivers] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [track, setTrack] = useState(null);
  const [sessionType, setSessionType] = useState(null);
  const [currentLap, setCurrentLap] = useState(0);
  const [authError, setAuthError] = useState(false);

  // Nav state
  const [activeTab, setActiveTab] = useState('live');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Previous Races state
  const [pastRaces, setPastRaces] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [pastStandings, setPastStandings] = useState([]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    const onTimingUpdate = (payload) => {
      setDrivers(payload?.drivers ?? []);
      setTrack(payload?.track ?? null);
      setSessionType(payload?.sessionType ?? null);
      setCurrentLap(payload?.currentLap ?? 0);
      setAuthError(payload?.authError ?? false);
      setLastUpdate(new Date());
    };

    socket.on('timing:update', onTimingUpdate);
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    return () => {
      socket.off('timing:update', onTimingUpdate);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'previous' && pastRaces.length === 0) {
      fetch('http://localhost:4000/api/races')
        .then(res => res.json())
        .then(data => {
          setPastRaces(data || []);
          if (data && data.length > 0) setSelectedRace(data[0].session_key);
        })
        .catch(err => console.error(err));
    }
  }, [activeTab, pastRaces.length]);

  useEffect(() => {
    if (activeTab === 'previous' && selectedRace) {
      fetch(`http://localhost:4000/api/race/${selectedRace}`)
        .then(res => res.json())
        .then(data => setPastStandings(data || []))
        .catch(err => console.error(err));
    }
  }, [selectedRace, activeTab]);

  const plottedDrivers = useMemo(
    () => normalizePoints(drivers, 900, 620, track),
    [drivers, track]
  );

  return (
    <div className="app">
      <nav className="top-nav">
        <h1>F1-Dash</h1>
        <div className="menu-container">
          <button className="menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
          {isMenuOpen && (
            <div className="menu-dropdown">
              <button className={activeTab === 'live' ? 'active' : ''} onClick={() => { setActiveTab('live'); setIsMenuOpen(false); }}>Live DASH</button>
              <button className={activeTab === 'previous' ? 'active' : ''} onClick={() => { setActiveTab('previous'); setIsMenuOpen(false); }}>Previous races</button>
            </div>
          )}
        </div>
      </nav>

      {activeTab === 'live' && (
        <>
          <header className="header">
            <p>
              {track ? `${track.name} - ${track.country}` : 'Live top 20 timing and track positions'}
            </p>
            {sessionType && (
              <div className="session-type">🏁 {sessionType}</div>
            )}
            {currentLap > 0 && (
              <div className="current-lap">Lap: {currentLap}</div>
            )}
            <div className="header-status">
              <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <span>{lastUpdate ? `Updated: ${lastUpdate.toLocaleTimeString()}` : 'Waiting for data...'}</span>
          </header>

          <main className="content">
            {authError && (
              <div style={{ backgroundColor: '#e74c3c', color: '#fff', padding: '12px 20px', borderRadius: '6px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px', width: '100%', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '1.5rem' }}>🔒</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '2px' }}>Live Session Restricted by OpenF1</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>Global API access is restricted during live sessions. Add OPENF1_API_KEY to your backend to view live telemetry.</div>
                </div>
              </div>
            )}
            <section className="table-pane">
              <h2>Timing</h2>
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Driver</th>
                    <th>Lap Time</th>
                    <th>S1</th>
                    <th>S2</th>
                    <th>S3</th>
                    <th>Gap</th>
                    <th>Stops</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver) => (
                    <tr key={driver.code}>
                      <td>{driver.position}</td>
                      <td>
                        {driver.hasFastestLap && <span className="fastest-lap-indicator" title="Fastest Lap"></span>}
                        <span 
                          className="team-color-indicator" 
                          style={{ backgroundColor: driver.teamColour }}
                        ></span>
                        {driver.code}
                      </td>
                      <td>{driver.lapTime}</td>
                      <td>{driver.sector1}</td>
                      <td>{driver.sector2}</td>
                      <td>{driver.sector3}</td>
                      <td>{driver.gap}</td>
                      <td>{driver.pitStops}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="map-pane">
              <h2>Track Map</h2>
              {track && track.bounds ? (() => {
                const tvb = track.isDynamic
                  ? `${track.bounds.minX} ${track.bounds.minY} ${track.bounds.maxX - track.bounds.minX} ${track.bounds.maxY - track.bounds.minY}`
                  : "0 0 300 350";
                const spanX = track.bounds.maxX - track.bounds.minX;
                const sw = track.isDynamic ? spanX * 0.005 : 2;
                const cr = track.isDynamic ? spanX * 0.015 : 4;
                const ts = track.isDynamic ? spanX * 0.03 : 6;
                const toX = track.isDynamic ? spanX * 0.02 : 6;
                const toY = track.isDynamic ? track.isDynamic ? -spanX * 0.01 : -4 : -4;
                
                return (
                  <svg viewBox={tvb} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Live track map">
                    <path
                      d={track.svg}
                      fill="none"
                      stroke="#404858"
                      strokeWidth={sw}
                    />
                    {plottedDrivers.length === 0 && !authError && <text x={track.bounds.minX + spanX/2} y={track.bounds.minY + (track.bounds.maxY - track.bounds.minY)/2} textAnchor="middle" fill="#f5f6fa" fontSize={ts*2}>Waiting for telemetry...</text>}
                    {authError && <text x={track.bounds.minX + spanX/2} y={track.bounds.minY + (track.bounds.maxY - track.bounds.minY)/2} textAnchor="middle" fill="#e74c3c" fontSize={ts*1.5}>API Key Required (401)</text>}
                    {plottedDrivers.map((driver) => {
                      if (driver.px === -999) return null;
                      return (
                        <g key={`dot-${driver.code}`}>
                          <circle cx={driver.px} cy={driver.py} r={cr} fill={driver.teamColour} stroke="#fff" strokeWidth={sw / 4 || 0.5} />
                          <text x={driver.px + toX} y={driver.py + toY} fill="#f5f6fa" fontSize={ts} fontWeight="600">
                            {driver.code}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })() : (
                <svg viewBox="0 0 300 350" role="img" aria-label="Live track map">
                  <text x="150" y="175" textAnchor="middle" fill={authError ? "#e74c3c" : "#f5f6fa"}>
                    {authError ? "API Key Required (401)" : "Waiting for track data..."}
                  </text>
                </svg>
              )}
            </section>
          </main>
        </>
      )}

      {activeTab === 'previous' && (
        <main className="content previous-content">
          <section className="table-pane full-width">
            <div className="previous-header">
              <h2>Select Race</h2>
              <select value={selectedRace || ''} onChange={(e) => setSelectedRace(e.target.value)}>
                {pastRaces.map(r => (
                  <option key={r.session_key} value={r.session_key}>
                    {r.circuit_short_name || r.country_name} - {new Date(r.date_start).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Driver</th>
                </tr>
              </thead>
              <tbody>
                {pastStandings.map((driver, index) => {
                  const isTop3 = index < 3;
                  const rowStyle = isTop3 ? { 
                    height: '80px', 
                    background: `linear-gradient(to right, ${driver.teamColour}60, #141c27)` 
                  } : {};
                  return (
                    <tr key={driver.code} style={rowStyle} className={isTop3 ? 'podium-row' : ''}>
                      <td className={`col-pos ${isTop3 ? 'pos-' + driver.position : ''}`}>
                        {driver.position}
                      </td>
                      <td>
                        <div className="driver-cell">
                          {isTop3 && driver.headshotUrl && (
                            <img src={driver.headshotUrl} alt={driver.code} className="driver-headshot" />
                          )}
                          {driver.hasFastestLap && <span className="fastest-lap-indicator" title="Fastest Lap"></span>}
                          {!isTop3 && (
                            <span className="team-color-indicator" style={{ backgroundColor: driver.teamColour }}></span>
                          )}
                          <span>{driver.code}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </main>
      )}
    </div>
  );
}

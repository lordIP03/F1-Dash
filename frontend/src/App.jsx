import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

function normalizePoints(drivers, width, height, trackBounds) {
  const withCoords = drivers.filter((d) => d.x !== 0 || d.y !== 0);

  if (withCoords.length < 2 || !trackBounds) {
    return drivers.map((d, index) => {
      const angle = (index / Math.max(drivers.length, 1)) * Math.PI * 2;
      return {
        ...d,
        px: width / 2 + Math.cos(angle) * (width * 0.28),
        py: height / 2 + Math.sin(angle) * (height * 0.28)
      };
    });
  }

  const minX = trackBounds.minX;
  const maxX = trackBounds.maxX;
  const minY = trackBounds.minY;
  const maxY = trackBounds.maxY;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const padding = 20;

  return drivers.map((d) => {
    const px = padding + ((d.x - minX) / spanX) * (width - padding * 2);
    const py = padding + ((d.y - minY) / spanY) * (height - padding * 2);
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
    () => normalizePoints(drivers, 900, 620, track?.bounds),
    [drivers, track?.bounds]
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
              <svg viewBox="0 0 300 350" role="img" aria-label="Live track map">
                {track ? (
                  <path
                    d={track.svg}
                    fill="none"
                    stroke="#404858"
                    strokeWidth="2"
                  />
                ) : (
                  <text x="150" y="175" textAnchor="middle" fill="#f5f6fa">
                    Waiting for track data...
                  </text>
                )}
                {plottedDrivers.map((driver) => (
                  <g key={`dot-${driver.code}`}>
                    <circle cx={driver.px} cy={driver.py} r="4" fill={driver.teamColour} stroke="#fff" strokeWidth="0.5" />
                    <text x={driver.px + 6} y={driver.py - 4} fill="#f5f6fa" fontSize="6" fontWeight="600">
                      {driver.code}
                    </text>
                  </g>
                ))}
              </svg>
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

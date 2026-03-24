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

  // Use track bounds if available
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

  useEffect(() => {
    // Create socket instance with error handling and reconnection settings
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
      setLastUpdate(new Date());
    };

    const onConnect = () => {
      setIsConnected(true);
      console.log('Connected to backend');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Disconnected from backend');
    };

    const onConnectError = (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    };

    // Register event handlers
    socket.on('timing:update', onTimingUpdate);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Cleanup on unmount
    return () => {
      socket.off('timing:update', onTimingUpdate);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.disconnect();
    };
  }, []);

  const plottedDrivers = useMemo(
    () => normalizePoints(drivers, 900, 620, track?.bounds),
    [drivers, track?.bounds]
  );

  return (
    <div className="app">
      <header className="header">
        <h1>F1-Dash</h1>
        <p>
          {track ? `${track.name} - ${track.country}` : 'Live top 10 timing and track positions'}
        </p>
        {sessionType && (
          <div className="session-type">🏁 {sessionType}</div>
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
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.code}>
                  <td>{driver.position}</td>
                  <td>{driver.code}</td>
                  <td>{driver.lapTime}</td>
                  <td>{driver.sector1}</td>
                  <td>{driver.sector2}</td>
                  <td>{driver.sector3}</td>
                  <td>{driver.gap}</td>
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
                <circle cx={driver.px} cy={driver.py} r="4" fill="#e10600" stroke="#fff" strokeWidth="0.5" />
                <text x={driver.px + 6} y={driver.py - 4} fill="#f5f6fa" fontSize="6" fontWeight="600">
                  {driver.code}
                </text>
              </g>
            ))}
          </svg>
        </section>
      </main>
    </div>
  );
}

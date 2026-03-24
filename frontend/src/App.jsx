import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
const socket = io(SOCKET_URL, { autoConnect: true });

function normalizePoints(drivers, width, height) {
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

  const xs = withCoords.map((d) => d.x);
  const ys = withCoords.map((d) => d.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const padding = 50;

  return drivers.map((d) => {
    const px = padding + ((d.x - minX) / spanX) * (width - padding * 2);
    const py = padding + ((d.y - minY) / spanY) * (height - padding * 2);
    return { ...d, px, py };
  });
}

export default function App() {
  const [drivers, setDrivers] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const onTimingUpdate = (payload) => {
      setDrivers(payload?.drivers ?? []);
      setLastUpdate(new Date());
    };

    socket.on('timing:update', onTimingUpdate);

    return () => {
      socket.off('timing:update', onTimingUpdate);
    };
  }, []);

  const plottedDrivers = useMemo(() => normalizePoints(drivers, 900, 620), [drivers]);

  return (
    <div className="app">
      <header className="header">
        <h1>F1-Dash</h1>
        <p>Live top 10 timing and track positions</p>
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
          <svg viewBox="0 0 900 620" role="img" aria-label="Live track map">
            <path
              d="M130 320 C130 170, 300 80, 470 100 C650 120, 790 220, 760 350 C730 490, 560 560, 390 530 C220 500, 130 440, 130 320 Z"
              fill="none"
              stroke="#404858"
              strokeWidth="18"
            />
            {plottedDrivers.map((driver) => (
              <g key={`dot-${driver.code}`}>
                <circle cx={driver.px} cy={driver.py} r="11" fill="#e10600" stroke="#fff" strokeWidth="1.5" />
                <text x={driver.px + 14} y={driver.py - 12} fill="#f5f6fa" fontSize="14" fontWeight="600">
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

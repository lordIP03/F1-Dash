import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import TRACK_LAYOUTS from './trackLayouts.js';

const PORT = process.env.PORT || 4000;
const OPENF1_BASE = 'https://api.openf1.org/v1';
const POLL_INTERVAL_MS = 2000;

const app = express();
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS
  }
});

const cache = {
  sessionKey: null,
  driverMap: new Map(),
  circuit: null,
  trackLayout: null,
  sessionType: null,
  lastPayload: { drivers: [], track: null, sessionType: null }
};

async function fetchJson(pathCandidates, timeoutMs = 5000) {
  for (const path of pathCandidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(`${OPENF1_BASE}${path}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data)) return data;
    } catch (error) {
      // try next candidate
      if (error instanceof TypeError) console.warn(`Fetch error for ${path}:`, error.message);
    }
  }
  return [];
}

function formatTime(value) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(3);
}

function normalizeCoordinate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getLatestByDriver(rows, key = 'driver_number') {
  const map = new Map();
  for (const row of rows) {
    if (!row || row[key] === undefined || row[key] === null) continue;
    map.set(row[key], row);
  }
  return map;
}

async function getLatestSessionKey() {
  const sessions = await fetchJson(['/sessions?session_key=latest', '/sessions']);
  if (!sessions.length) return null;
  if (sessions[0].session_key) return sessions[0].session_key;

  const sorted = sessions
    .filter((s) => s.session_key)
    .sort((a, b) => new Date(b.date_start || 0) - new Date(a.date_start || 0));
  return sorted[0]?.session_key ?? null;
}

async function updateDriverMap(sessionKey) {
  const drivers = await fetchJson([
    `/drivers?session_key=${sessionKey}`,
    `/drivers?meeting_key=latest`
  ]);

  const map = new Map();
  drivers.forEach((driver) => {
    if (driver?.driver_number == null) return;
    map.set(driver.driver_number, driver.name_acronym || driver.broadcast_name || String(driver.driver_number));
  });
  cache.driverMap = map;
}

async function updateCircuit(sessionKey) {
  const sessions = await fetchJson([
    `/sessions?session_key=${sessionKey}`,
    `/sessions?meeting_key=latest`
  ]);
  
  if (sessions.length > 0) {
    const session = sessions[0];
    
    // Extract session type (Practice 1, Practice 2, Practice 3, Qualifying, Race)
    cache.sessionType = session.session_type || 'Unknown';
    
    if (session.circuit_key) {
      const circuitKey = session.circuit_key;
      const circuitData = await fetchJson([`/circuits?circuit_key=${circuitKey}`]);
      
      if (circuitData.length > 0) {
        const circuit = circuitData[0];
        cache.circuit = {
          name: circuit.circuit_name || 'Unknown',
          country: circuit.country_name || 'Unknown',
          key: circuitKey
        };
        
        // Get track layout from TRACK_LAYOUTS using circuit key
        cache.trackLayout = TRACK_LAYOUTS[circuitKey] || TRACK_LAYOUTS[1]; // Fallback to Australia
      }
    }
  }
}

async function fetchDashboardData() {
  const sessionKey = cache.sessionKey || (await getLatestSessionKey());
  if (!sessionKey) return cache.lastPayload;

  if (cache.sessionKey !== sessionKey || cache.driverMap.size === 0) {
    cache.sessionKey = sessionKey;
    await updateDriverMap(sessionKey);
    await updateCircuit(sessionKey);
  }

  const results = await Promise.allSettled([
    fetchJson([
      `/position?session_key=${sessionKey}`,
      `/positions?session_key=${sessionKey}`
    ]),
    fetchJson([
      `/laps?session_key=${sessionKey}`
    ]),
    fetchJson([
      `/intervals?session_key=${sessionKey}`
    ]),
    fetchJson([
      `/location?session_key=${sessionKey}`,
      `/locations?session_key=${sessionKey}`
    ])
  ]);

  const [positions, laps, intervals, locations] = results.map((r) => r.status === 'fulfilled' ? r.value : []);

  const latestPosByDriver = getLatestByDriver(positions);
  const latestLapByDriver = getLatestByDriver(laps);
  const latestIntervalByDriver = getLatestByDriver(intervals);
  const latestLocationByDriver = getLatestByDriver(locations);

  const topDrivers = [...latestPosByDriver.values()]
    .filter((d) => d && Number.isFinite(Number(d.position)))
    .sort((a, b) => Number(a?.position || 0) - Number(b?.position || 0))
    .slice(0, 10)
    .map((pos) => {
      if (!pos || pos.driver_number == null) return null;
      const driverNum = pos.driver_number;
      const lap = latestLapByDriver.get(driverNum) || {};
      const interval = latestIntervalByDriver.get(driverNum) || {};
      const location = latestLocationByDriver.get(driverNum) || {};

      return {
        position: Number(pos.position) || 0,
        code: cache.driverMap.get(driverNum) || String(driverNum),
        lapTime: formatTime(lap?.lap_duration),
        sector1: formatTime(lap?.duration_sector_1),
        sector2: formatTime(lap?.duration_sector_2),
        sector3: formatTime(lap?.duration_sector_3),
        gap: interval?.interval_to_leader ? String(interval.interval_to_leader) : '-',
        x: normalizeCoordinate(location?.x),
        y: normalizeCoordinate(location?.y)
      };
    }).filter(Boolean);

  const payload = {
    drivers: topDrivers,
    track: cache.trackLayout ? {
      name: cache.circuit?.name || 'Unknown',
      country: cache.circuit?.country || 'Unknown',
      svg: cache.trackLayout.svg,
      bounds: cache.trackLayout.bounds
    } : null,
    sessionType: cache.sessionType
  };
  cache.lastPayload = payload;
  return payload;
}

async function tick() {
  try {
    const payload = await fetchDashboardData();
    io.emit('timing:update', payload);
  } catch (error) {
    console.error('Polling error:', error.message);
    io.emit('timing:update', cache.lastPayload);
  }
}

io.on('connection', (socket) => {
  socket.emit('timing:update', cache.lastPayload);
});

const tickInterval = setInterval(tick, POLL_INTERVAL_MS);
tick();

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(tickInterval);
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

httpServer.listen(PORT, () => {
  console.log(`F1-Dash backend listening on http://localhost:${PORT}`);
});

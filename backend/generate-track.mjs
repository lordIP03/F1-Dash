import fs from 'fs';

async function buildTrackMap() {
  const sessionKey = 'latest';
  const fetchJson = async (path) => {
    const res = await fetch(`https://api.openf1.org/v1${path}`);
    if (!res.ok) throw new Error('Failed to fetch ' + path);
    return res.json();
  };

  const laps = await fetchJson(`/laps?session_key=${sessionKey}`);
  if (!laps.length) return console.log('No laps');

  const validLap = laps.find(l => l.duration_sector_1 && l.duration_sector_2 && l.duration_sector_3 && l.lap_duration);
  if (!validLap) return console.log('No valid lap');

  const startTime = new Date(validLap.date_start);
  const endTime = new Date(startTime.getTime() + (validLap.lap_duration * 1000) + 2000);
  
  const locs = await fetchJson(`/location?session_key=${sessionKey}&driver_number=${validLap.driver_number}&date%3E%3D${startTime.toISOString()}&date%3C%3D${endTime.toISOString()}`);
  
  console.log('Got', locs.length, 'locations');
  if (locs.length === 0) return;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  locs.forEach(l => {
    if (l.x < minX) minX = l.x;
    if (l.x > maxX) maxX = l.x;
    if (l.y < minY) minY = l.y;
    if (l.y > maxY) maxY = l.y;
  });

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  // We want to map to a 300x350 box with 20 padding, preserving aspect ratio
  const width = 300, height = 350, padding = 20;
  const availWidth = width - padding * 2;
  const availHeight = height - padding * 2;
  
  // To preserve aspect ratio, take the smaller scale
  const scale = Math.min(availWidth / spanX, availHeight / spanY);
  
  // Calculate offsets to center the map
  const offsetX = padding + (availWidth - (spanX * scale)) / 2;
  const offsetY = padding + (availHeight - (spanY * scale)) / 2;

  let svgPath = '';
  locs.forEach((l, i) => {
    // Note: F1 Y is usually inverted compared to screen coordinates, so map max->min
    // Usually North is up, telemetry uses Cartesian Y is up, SVG Y is down
    const px = offsetX + (l.x - minX) * scale;
    const py = offsetY + (maxY - l.y) * scale; // Invert Y
    
    if (i === 0) svgPath += `M${px.toFixed(1)} ${py.toFixed(1)} `;
    else svgPath += `L${px.toFixed(1)} ${py.toFixed(1)} `;
  });
  svgPath += 'Z';

  console.log('Generated path length:', svgPath.length);
  // console.log('First 100 chars:', svgPath.substring(0, 100));
}

buildTrackMap().catch(console.error);

const fs = require('fs');

async function buildTrackMap() {
  const sessionKey = 'latest';
  const fetch = globalThis.fetch;
  
  // 1. Get laps
  const lapsRes = await fetch(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`);
  const laps = await lapsRes.json();
  
  if (!laps || !laps.length) return console.log('No laps found');
  
  // 2. Find a complete lap (has all 3 sectors)
  const validLap = laps.find(l => l.duration_sector_1 && l.duration_sector_2 && l.duration_sector_3 && l.lap_duration);
  if (!validLap) return console.log('No valid lap found');
  
  console.log('Valid lap found for driver', validLap.driver_number);
  
  // 3. Dates
  // OpenF1 expects dates in ISO8601, URL encoded
  const startTime = new Date(validLap.date_start);
  const endTime = new Date(startTime.getTime() + (validLap.lap_duration * 1000));
  
  // OpenF1 syntax for filters: field>value
  // e.g. date>2023-04-02T05:01:00 date<2023-04-02T05:02:40
  const url = `https://api.openf1.org/v1/location?session_key=${sessionKey}&driver_number=${validLap.driver_number}&date%3E=${startTime.toISOString()}&date%3C=${endTime.toISOString()}`;
  console.log('Fetching', url);
  
  const locRes = await fetch(url);
  const locs = await locRes.json();
  
  console.log('Received', locs.length, 'locations');
  
  if (locs.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let path = '';
    
    locs.forEach((l, i) => {
      if (l.x < minX) minX = l.x;
      if (l.x > maxX) maxX = l.x;
      // In F1 telemetry, Y is usually inverted relative to screen
      // But we just capture min/max to let frontend handle it
      if (l.y < minY) minY = l.y;
      if (l.y > maxY) maxY = l.y;
      
      if (i === 0) path += `M${l.x} ${l.y} `;
      else path += `L${l.x} ${l.y} `;
    });
    path += 'Z'; // close path
    
    const svgData = {
      path,
      bounds: { minX, maxX, minY, maxY }
    };
    
    fs.writeFileSync('generated_track.json', JSON.stringify(svgData, null, 2));
    console.log('Saved to generated_track.json');
  }
}
buildTrackMap().catch(console.error);

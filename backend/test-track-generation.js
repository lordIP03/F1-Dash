const fetch = require('node-fetch');

async function testFetchHqTrackMap() {
  const sessionKey = 'latest';
  // First get laps to find a complete lap
  const lapsRes = await fetch(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`);
  const laps = await lapsRes.json();
  
  // Find a valid lap
  const validLap = laps.find(l => l.duration_sector_1 && l.duration_sector_2 && l.duration_sector_3);
  if (!validLap) return console.log('No valid lap');
  
  const startTime = validLap.date_start;
  // Lap duration is in seconds, need end time
  const endTimeDate = new Date(new Date(startTime).getTime() + (validLap.lap_duration * 1000));
  const endTime = endTimeDate.toISOString();
  
  console.log('Fetching location for driver', validLap.driver_number, 'from', startTime, 'to', endTime);
  
  const locRes = await fetch(`https://api.openf1.org/v1/location?session_key=${sessionKey}&driver_number=${validLap.driver_number}&date<${endTime}&date>=${startTime}`);
  const locs = await locRes.json();
  
  console.log('Found', locs.length, 'locations');
  // Min max X Y
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  locs.forEach(l => {
    if (l.x < minX) minX = l.x;
    if (l.x > maxX) maxX = l.x;
    if (l.y < minY) minY = l.y;
    if (l.y > maxY) maxY = l.y;
  });
  
  console.log('Bounds:', {minX, maxX, minY, maxY});
}
testFetchHqTrackMap().catch(console.error);

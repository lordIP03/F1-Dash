// F1 Circuit Track Layouts with SVG paths and bounding boxes
// SVG paths are normalized and scaled for viewing
const TRACK_LAYOUTS = {
  // Monaco
  3: {
    name: 'Monaco',
    country: 'Monaco',
    svg: 'M50 200 L60 180 L80 160 L110 140 L140 135 L170 145 L200 160 L220 180 L230 210 L240 240 L245 270 L240 300 L220 320 L190 330 L160 335 L130 330 L100 320 L70 310 L50 290 L40 260 L35 230 L40 200 Z',
    bounds: { minX: 0, maxX: 300, minY: 100, maxY: 380 }
  },
  // Bahrain (Sakhir)
  6: {
    name: 'Bahrain',
    country: 'Bahrain',
    svg: 'M80 100 L150 120 L200 140 L240 170 L260 210 L270 250 L260 290 L220 310 L170 320 L120 310 L80 290 L50 260 L40 220 L45 180 L60 140 L80 100 Z',
    bounds: { minX: 20, maxX: 300, minY: 80, maxY: 340 }
  },
  // Saudi Arabia (Jeddah)
  7: {
    name: 'Saudi Arabia',
    country: 'Saudi Arabia',
    svg: 'M100 50 L180 65 L250 90 L290 130 L310 180 L315 240 L310 290 L280 320 L220 335 L150 340 L90 330 L50 300 L30 250 L25 190 L35 130 L60 80 L100 50 Z',
    bounds: { minX: 15, maxX: 330, minY: 40, maxY: 350 }
  },
  // Australia (Melbourne)
  1: {
    name: 'Australia',
    country: 'Australia',
    svg: 'M60 250 L100 240 L140 220 L170 200 L190 170 L200 140 L200 100 L190 70 L160 55 L130 50 L100 60 L80 80 L65 110 L58 150 L55 190 L58 230 L60 250 Z',
    bounds: { minX: 40, maxX: 220, minY: 40, maxY: 280 }
  },
  // Silverstone
  9: {
    name: 'Silverstone',
    country: 'UK',
    svg: 'M70 80 L130 70 L180 85 L220 110 L250 150 L260 200 L250 250 L210 280 L160 290 L110 280 L70 250 L45 200 L40 150 L50 100 L70 80 Z',
    bounds: { minX: 30, maxX: 280, minY: 60, maxY: 310 }
  },
  // Hungary (Budapest)
  8: {
    name: 'Hungary',
    country: 'Hungary',
    svg: 'M80 100 L140 90 L190 105 L230 135 L250 175 L255 220 L245 260 L205 285 L150 295 L100 285 L60 260 L40 220 L35 170 L45 120 L80 100 Z',
    bounds: { minX: 25, maxX: 270, minY: 80, maxY: 310 }
  },
  // Monza
  11: {
    name: 'Monza',
    country: 'Italy',
    svg: 'M100 50 L160 60 L210 80 L250 110 L270 150 L280 200 L270 250 L240 280 L190 295 L130 290 L80 270 L50 240 L35 190 L40 130 L60 80 L100 50 Z',
    bounds: { minX: 25, maxX: 290, minY: 40, maxY: 310 }
  },
  // Singapore
  15: {
    name: 'Singapore',
    country: 'Singapore',
    svg: 'M60 150 L100 140 L150 145 L190 160 L220 185 L240 220 L245 260 L235 295 L200 315 L160 325 L120 320 L80 305 L50 280 L35 240 L30 190 L40 150 L60 150 Z',
    bounds: { minX: 20, maxX: 260, minY: 130, maxY: 340 }
  },
  // USA (Austin)
  16: {
    name: 'USA',
    country: 'USA',
    svg: 'M90 80 L150 75 L200 95 L240 125 L260 165 L265 210 L255 250 L220 275 L170 290 L120 285 L75 265 L50 230 L40 180 L45 130 L70 95 L90 80 Z',
    bounds: { minX: 30, maxX: 280, minY: 60, maxY: 310 }
  },
  // Brazil (Sao Paulo)
  17: {
    name: 'Brazil',
    country: 'Brazil',
    svg: 'M100 70 L160 65 L210 85 L250 115 L270 155 L275 205 L265 250 L230 280 L170 300 L110 305 L60 285 L35 250 L25 200 L30 150 L55 100 L100 70 Z',
    bounds: { minX: 15, maxX: 290, minY: 50, maxY: 320 }
  },
  // Abu Dhabi
  2: {
    name: 'Abu Dhabi',
    country: 'UAE',
    svg: 'M80 100 L140 95 L190 110 L230 140 L255 180 L265 220 L260 260 L230 285 L180 300 L120 305 L70 290 L40 260 L25 220 L20 170 L35 120 L80 100 Z',
    bounds: { minX: 10, maxX: 280, minY: 80, maxY: 320 }
  },
  // Japan (Suzuka)
  12: {
    name: 'Japan',
    country: 'Japan',
    svg: 'M100 60 L160 55 L210 75 L245 105 L265 150 L270 200 L260 245 L225 275 L170 295 L110 300 L60 280 L35 240 L20 190 L25 130 L50 80 L100 60 Z',
    bounds: { minX: 10, maxX: 285, minY: 45, maxY: 310 }
  },
  // Mexico City
  13: {
    name: 'Mexico City',
    country: 'Mexico',
    svg: 'M90 90 L150 80 L200 100 L240 130 L260 170 L265 215 L250 255 L210 280 L150 295 L95 290 L50 265 L30 225 L25 175 L40 125 L70 95 L90 90 Z',
    bounds: { minX: 15, maxX: 280, minY: 70, maxY: 310 }
  },
  // Canada (Montreal)
  5: {
    name: 'Canada',
    country: 'Canada',
    svg: 'M85 100 L140 90 L190 105 L230 135 L250 175 L260 220 L250 260 L210 285 L150 295 L100 285 L60 260 L40 215 L32 165 L40 115 L70 95 L85 100 Z',
    bounds: { minX: 25, maxX: 270, minY: 80, maxY: 310 }
  },
  // Spain (Barcelona)
  4: {
    name: 'Spain',
    country: 'Spain',
    svg: 'M95 95 L150 85 L200 100 L240 130 L260 170 L265 215 L250 255 L210 280 L150 290 L100 285 L55 260 L35 220 L25 170 L30 120 L55 95 L95 95 Z',
    bounds: { minX: 15, maxX: 280, minY: 75, maxY: 305 }
  }
};

export default TRACK_LAYOUTS;

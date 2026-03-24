# F1-Dash (V1)

Full-stack real-time Formula 1 dashboard.

## Stack

- Backend: Node.js + Express + Socket.io
- Frontend: React (Vite)
- Data Source: OpenF1 API (`https://api.openf1.org`)

## Features

- Polls OpenF1 every 2 seconds
- Streams top-10 driver timing + sectors + gap + coordinates over WebSocket
- Live timing table (left 40%)
- Live SVG track map (right 60%)
- Dark, minimal F1-inspired UI

## Project Structure

```text
/backend   # Express + Socket.io server
/frontend  # React (Vite) client
```

## Run Backend

```bash
cd backend
npm install
npm run dev
```

Backend starts at: `http://localhost:4000`

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at: `http://localhost:5173`

## Environment Variables

Frontend (optional):

- `VITE_SOCKET_URL` (default `http://localhost:4000`)

Backend (optional):

- `PORT` (default `4000`)

## Socket Payload Shape

```json
{
  "drivers": [
    {
      "position": 1,
      "code": "VER",
      "lapTime": "91.437",
      "sector1": "30.122",
      "sector2": "31.005",
      "sector3": "30.310",
      "gap": "+0.000",
      "x": 123,
      "y": 456
    }
  ]
}
```

## Notes

- If some OpenF1 fields are unavailable, values are safely set to `-` (or `0` for coordinates).
- Coordinate plotting auto-normalizes raw x/y values into the SVG view box.

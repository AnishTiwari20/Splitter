import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const DATA_FILE = path.join(__dirname, 'server-data.json');

// In-memory rooms cache
let rooms = {};

// Load saved data if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    rooms = JSON.parse(raw);
  }
} catch (err) {
  console.error('Failed to load server-data.json:', err);
}

function persistData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(rooms, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist server data:', err);
  }
}

app.use(cors());
app.use(express.json());

// Serve static frontend files from dist if built
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// REST endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  res.json(rooms[roomId] || null);
});

// WebSocket real-time collaboration
wss.on('connection', (ws) => {
  let currentRoomId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'JOIN_ROOM') {
        currentRoomId = data.roomId;
        ws.roomId = currentRoomId;

        // Send existing room state to this user
        if (rooms[currentRoomId]) {
          ws.send(JSON.stringify({
            type: 'ROOM_STATE',
            roomId: currentRoomId,
            state: rooms[currentRoomId],
          }));
        }
      }

      if (data.type === 'UPDATE_ROOM') {
        const { roomId, state } = data;
        if (!roomId || !state) return;

        rooms[roomId] = state;
        persistData();

        // Broadcast to all other clients connected to the same room
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN && client.roomId === roomId) {
            client.send(JSON.stringify({
              type: 'ROOM_STATE',
              roomId,
              state,
            }));
          }
        });
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    // Client disconnected
  });
});

// Fallback route for SPA (Express 5 compatible)
app.use((req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.send('Splitter API server is running. Build frontend with `npm run build` or use Vite dev server.');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Splitter server listening on http://0.0.0.0:${PORT}`);
});

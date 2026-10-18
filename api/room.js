// In-memory serverless cache
// Keeps the state synchronized across all users connected to the same room
const roomStore = {};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { roomId } = req.query;

  // GET: Fetch room state
  if (req.method === 'GET') {
    if (!roomId) {
      return res.status(200).json(roomStore);
    }
    const state = roomStore[roomId] || null;
    return res.status(200).json(state);
  }

  // POST: Update room state
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const targetRoomId = body.roomId || roomId;
    const newState = body.state;

    if (targetRoomId && newState) {
      roomStore[targetRoomId] = newState;
      return res.status(200).json({ success: true, state: roomStore[targetRoomId] });
    }

    return res.status(400).json({ error: 'Missing roomId or state' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Hybrid Sync Manager
 * Supports both WebSockets (for Node.js hosting) and HTTP Polling (for Vercel serverless)
 */

class SyncManager {
  constructor() {
    this.ws = null;
    this.currentRoomId = null;
    this.onStateReceived = null;
    this.onConnectionChange = null;
    this.isConnected = false;
    this.reconnectTimeout = null;
    this.pollingInterval = null;
    this.lastKnownTimestamp = 0;
  }

  connect(roomId, onStateReceived, onConnectionChange) {
    this.currentRoomId = roomId;
    this.onStateReceived = onStateReceived;
    this.onConnectionChange = onConnectionChange;

    this.stopPolling();
    this.initWebSocket();
    this.startHttpPolling();
  }

  initWebSocket() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }

    // Determine WebSocket host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    if (window.location.port === '5173') {
      host = `${window.location.hostname}:3000`;
    }

    try {
      this.ws = new WebSocket(`${protocol}//${host}`);

      this.ws.onopen = () => {
        this.isConnected = true;
        if (this.onConnectionChange) this.onConnectionChange(true);

        if (this.currentRoomId) {
          this.ws.send(JSON.stringify({
            type: 'JOIN_ROOM',
            roomId: this.currentRoomId,
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ROOM_STATE' && data.roomId === this.currentRoomId) {
            if (this.onStateReceived) {
              this.onStateReceived(data.state);
            }
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        // Don't show disconnected if HTTP polling is working
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch (e) {
      // Running on serverless like Vercel without WebSockets - HTTP polling takes over
    }
  }

  startHttpPolling() {
    // Initial fetch from /api/room
    this.fetchRoomStateHttp();

    // Poll every 3 seconds for updates
    this.pollingInterval = setInterval(() => {
      this.fetchRoomStateHttp();
    }, 3000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async fetchRoomStateHttp() {
    if (!this.currentRoomId) return;

    try {
      const res = await fetch(`/api/room?roomId=${encodeURIComponent(this.currentRoomId)}`);
      if (res.ok) {
        const state = await res.json();
        if (state && this.onStateReceived) {
          if (this.onConnectionChange) this.onConnectionChange(true);
          this.onStateReceived(state);
        }
      }
    } catch (err) {
      // Network error or offline
    }
  }

  updateRoomState(roomId, state) {
    // 1. Send via WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'UPDATE_ROOM',
          roomId,
          state,
        }));
      } catch (e) {}
    }

    // 2. Also send via HTTP POST to /api/room (works on Vercel & local server)
    fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, state }),
    }).catch(() => {});
  }

  disconnect() {
    this.stopPolling();
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
  }
}

export const syncManager = new SyncManager();

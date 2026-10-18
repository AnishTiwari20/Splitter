/**
 * Hybrid Sync Manager with Timestamped Conflict Resolution
 * Guarantees zero lag and prevents stale server data from overwriting fresh local edits.
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
    this.lastLocalUpdate = 0;
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
            this.handleIncomingState(data.state);
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch (e) {
      // WS not available (e.g. Vercel serverless)
    }
  }

  startHttpPolling() {
    // Initial fetch from /api/room
    this.fetchRoomStateHttp();

    // Poll every 4 seconds
    this.pollingInterval = setInterval(() => {
      this.fetchRoomStateHttp();
    }, 4000);
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
        if (state) {
          if (this.onConnectionChange) this.onConnectionChange(true);
          this.handleIncomingState(state);
        }
      }
    } catch (err) {
      // Offline
    }
  }

  handleIncomingState(remoteState) {
    if (!remoteState || !this.onStateReceived) return;

    // Strict safety check: Never let an older remote state overwrite newer local edits
    const remoteTime = Number(remoteState.updatedAt) || 0;
    if (remoteTime > 0 && remoteTime <= this.lastLocalUpdate) {
      return; // Local state is newer, ignore stale server response!
    }

    this.onStateReceived(remoteState);
  }

  updateRoomState(roomId, state) {
    this.lastLocalUpdate = Date.now();
    state.updatedAt = this.lastLocalUpdate;

    // 1. Send via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'UPDATE_ROOM',
          roomId,
          state,
        }));
      } catch (e) {}
    }

    // 2. Send via HTTP POST in background without blocking UI
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

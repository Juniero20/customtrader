// services/public_websocket_client.js
export class PublicWebSocket {
  constructor(appId = import.meta.env.VITE_DERIV_APP_ID) {
    this.appId = appId;
    this.socket = null;
    this.subscribers = new Set();
    this.activeSubscriptions = new Set();
    this.messageQueue = [];
    this.isConnecting = false;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.baseReconnectDelay = 5000;
    this.connectionTimeout = 10000;
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.heartbeatIntervalTime = 30000;
    this.heartbeatTimeoutTime = 60000;
  }

  async connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {

      if (this.socket) {
        this.socket.close(1000, 'Reconnecting');
        this.socket = null;
      }

      const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
      this.socket = new WebSocket(wsUrl);

      const connectionTimeout = setTimeout(() => {
        this.socket?.close(1000, 'Connection timeout');
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);

      this.socket.onopen = () => {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        this.processMessageQueue();

        this.resubscribe();

        resolve();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.pong) {
            this.handlePong();
          } else if (data.error) {
            this.handleError(data.error);
          } else {
            this.notifySubscribers('message', data);
          }
        } catch (error) {
          this.notifySubscribers('error', {
            message: 'Invalid message format',
            error: error.message
          });
        }
      };

      this.socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        this.stopHeartbeat();

        if (!event.wasClean) {
          this.reconnect();
        }

        reject(new Error(`Connection closed: ${event.reason || 'Unknown reason'}`));
      };

      this.socket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        this.notifySubscribers('error', {
          message: 'WebSocket error',
          error: error.message || 'Unknown error'
        });
        reject(new Error('WebSocket error'));
      };
    });

    return this.connectionPromise;
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  resubscribe() {
    this.activeSubscriptions.forEach(symbol => {
      this.subscribeToTicks(symbol);
    });
  }

  handlePong() {
    clearTimeout(this.heartbeatTimeout);
    this.startHeartbeatTimeout();
  }

  handleError(error) {
    this.notifySubscribers('error', {
      message: error.message,
      code: error.code,
      details: error.details
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.unsubscribeCallback(callback);
  }

  unsubscribeCallback(callback) {
    this.subscribers.delete(callback);
  }

  notifySubscribers(event, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Wesocket error:', error);
      }
    });
  }

  send(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(data);
      if (!this.isConnecting) {
        this.connect().catch(error => {
          console.error("data error,", error);
        });
      }
      return;
    }

    try {
      const message = JSON.stringify(data);
      this.socket.send(message);
    } catch (error) {
      console.error("data error;", error);
      this.messageQueue.push(data);
      this.reconnect();
    }
  }

  subscribeToTicks(symbol) {
    if (this.activeSubscriptions.has(symbol)) {
      return;
    }

    this.send({ ticks: symbol, subscribe: 1 });
    this.activeSubscriptions.add(symbol);
  }

  unsubscribe(symbol) {
    if (!this.activeSubscriptions.has(symbol)) {
      return;
    }

    this.send({ forget: symbol });
    this.activeSubscriptions.delete(symbol);
  }

  async fetchHistoricalTicks(symbol, count = 60, retries = 2) {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 180;

    const request = {
      ticks_history: symbol,
      end: endTime,
      start: startTime,
      count,
      style: 'ticks'
    };

    this.send(request);

    const errorHandler = (error) => {
      if (error.code === 'RateLimit' && retries > 0) {
        const delay = 2000 * (this.maxReconnectAttempts - retries + 1);
        setTimeout(() => {
          this.fetchHistoricalTicks(symbol, count, retries - 1);
        }, delay);
      } else {
        this.notifySubscribers('error', {
          message: `Failed to fetch history for ${symbol}`,
          error
        });
      }
    };

    const unsubscribe = this.subscribe((event, data) => {
      if (event === 'error' && data.echo_req?.ticks_history === symbol) {
        errorHandler(data);
        unsubscribe();
      }
    });
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.notifySubscribers('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );

    setTimeout(() => {
      this.connect().catch(error => {
        console.error("Time out error;", error);
      });
    }, delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.send({ ping: 1 });
          this.startHeartbeatTimeout();
        } catch (error) {
          console.error('Heart error;', error);
          this.reconnect();
        }
      }
    }, this.heartbeatIntervalTime);
  }

  startHeartbeatTimeout() {
    this.stopHeartbeatTimeout();
    this.heartbeatTimeout = setTimeout(() => {
      this.reconnect();
    }, this.heartbeatTimeoutTime);
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
    this.stopHeartbeatTimeout();
  }

  stopHeartbeatTimeout() {
    clearTimeout(this.heartbeatTimeout);
    this.heartbeatTimeout = null;
  }

  close() {
    this.stopHeartbeat();
    this.activeSubscriptions.forEach(symbol => this.unsubscribe(symbol));
    this.activeSubscriptions.clear();
    this.messageQueue = [];
    this.socket?.close(1000, 'Client initiated close');
    this.socket = null;
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const publicWebSocket = new PublicWebSocket();
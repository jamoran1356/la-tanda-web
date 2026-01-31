/**
 * La Tanda - WebSocket Client
 * Real-time updates client-side integration
 */

import io from 'socket.io-client';

class WebSocketClient {
  constructor(url = window.location.origin) {
    this.url = url;
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  /**
   * Connect to WebSocket server
   */
  connect(token) {
    if (this.socket && this.socket.connected) {
      console.warn('Already connected to WebSocket');
      return;
    }

    this.socket = io(this.url, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ['websocket', 'polling']
    });

    this.setupListeners();
  }

  /**
   * Setup event listeners
   */
  setupListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('✓ Connected to WebSocket');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onConnected?.();
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Disconnected from WebSocket');
      this.isConnected = false;
      this.onDisconnected?.();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.onError?.(error);
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    });

    // User events
    this.socket.on('user:joined', (data) => {
      console.log('User joined:', data);
      this.onUserJoined?.(data);
    });

    // Transaction events
    this.socket.on('transaction:new', (data) => {
      console.log('New transaction:', data);
      this.onTransactionNew?.(data);
    });

    // Balance events
    this.socket.on('balance:updated', (data) => {
      console.log('Balance updated:', data);
      this.onBalanceUpdated?.(data);
    });

    // Tanda events
    this.socket.on('tanda:subscribed', (data) => {
      console.log('Subscribed to tanda:', data);
      this.onTandaSubscribed?.(data);
    });

    this.socket.on('tanda:unsubscribed', (data) => {
      console.log('Unsubscribed from tanda:', data);
      this.onTandaUnsubscribed?.(data);
    });

    this.socket.on('tanda:status-changed', (data) => {
      console.log('Tanda status changed:', data);
      this.onTandaStatusChanged?.(data);
    });

    // Admin events
    this.socket.on('admin:subscribed', (data) => {
      console.log('Admin subscribed:', data);
      this.onAdminSubscribed?.(data);
    });

    this.socket.on('admin:notification', (data) => {
      console.log('Admin notification:', data);
      this.onAdminNotification?.(data);
    });

    // Ping/pong for connection check
    this.socket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      this.onPong?.(latency);
    });
  }

  /**
   * Join user room
   */
  joinUser() {
    if (!this.socket) return;
    this.socket.emit('user:join', {});
  }

  /**
   * Subscribe to tanda updates
   */
  subscribeTanda(tandaId) {
    if (!this.socket) return;
    this.socket.emit('tanda:subscribe', { tandaId });
  }

  /**
   * Unsubscribe from tanda updates
   */
  unsubscribeTanda(tandaId) {
    if (!this.socket) return;
    this.socket.emit('tanda:unsubscribe', { tandaId });
  }

  /**
   * Subscribe to admin updates
   */
  subscribeAdmin() {
    if (!this.socket) return;
    this.socket.emit('admin:subscribe', {});
  }

  /**
   * Check connection status
   */
  ping() {
    if (!this.socket) return;
    this.socket.emit('ping', {});
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Listen for transaction updates
   */
  onTransaction(callback) {
    this.onTransactionNew = callback;
  }

  /**
   * Listen for balance updates
   */
  onBalance(callback) {
    this.onBalanceUpdated = callback;
  }

  /**
   * Listen for tanda status changes
   */
  onTandaStatus(callback) {
    this.onTandaStatusChanged = callback;
  }

  /**
   * Listen for admin notifications
   */
  onAdminNotif(callback) {
    this.onAdminNotification = callback;
  }

  /**
   * Listen for connection events
   */
  onConnect(callback) {
    this.onConnected = callback;
  }

  onDisconnect(callback) {
    this.onDisconnected = callback;
  }

  onError(callback) {
    this.onError = callback;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
      url: this.url
    };
  }
}

export default WebSocketClient;

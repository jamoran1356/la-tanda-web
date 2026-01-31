/**
 * La Tanda - WebSocket Server Implementation
 * Real-time updates for transactions, balances, and tanda status
 * 
 * Bounty #5: WebSocket Real-time Updates (450 LTD)
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../../middleware/logger');
const { verifyJWT } = require('../../middleware/auth');

class WebSocketServer {
  constructor(expressApp) {
    this.app = expressApp;
    this.server = http.createServer(expressApp);
    this.io = socketIO(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupNamespaces();
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
      } catch (err) {
        logger.warn('WebSocket auth failed', { error: err.message });
        return next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  /**
   * Setup main event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('User connected via WebSocket', { userId: socket.userId });

      // User joined
      socket.on('user:join', (data) => {
        socket.join(`user:${socket.userId}`);
        socket.emit('user:joined', { 
          success: true, 
          userId: socket.userId 
        });
      });

      // Subscribe to tanda updates
      socket.on('tanda:subscribe', (data) => {
        const { tandaId } = data;
        socket.join(`tanda:${tandaId}`);
        socket.emit('tanda:subscribed', { 
          success: true, 
          tandaId 
        });
      });

      // Subscribe to global updates (admin only)
      socket.on('admin:subscribe', (data) => {
        if (socket.userRole !== 'admin' && socket.userRole !== 'super_admin') {
          socket.emit('admin:subscribe:error', { 
            error: 'Unauthorized' 
          });
          return;
        }
        socket.join('admin:notifications');
        socket.emit('admin:subscribed', { success: true });
      });

      // Unsubscribe from tanda
      socket.on('tanda:unsubscribe', (data) => {
        const { tandaId } = data;
        socket.leave(`tanda:${tandaId}`);
        socket.emit('tanda:unsubscribed', { 
          success: true, 
          tandaId 
        });
      });

      // Connection status check (ping/pong)
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Disconnect
      socket.on('disconnect', () => {
        logger.info('User disconnected from WebSocket', { 
          userId: socket.userId 
        });
      });

      // Error handling
      socket.on('error', (error) => {
        logger.error('WebSocket error', { 
          userId: socket.userId, 
          error: error.message 
        });
      });
    });
  }

  /**
   * Setup specialized namespaces
   */
  setupNamespaces() {
    // Transactions namespace
    this.io.of('/transactions').use((socket, next) => {
      const token = socket.handshake.auth.token;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    }).on('connection', (socket) => {
      socket.on('subscribe:balance', () => {
        socket.join(`balance:${socket.userId}`);
      });
    });

    // Admin namespace
    this.io.of('/admin').use((socket, next) => {
      const token = socket.handshake.auth.token;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
          throw new Error('Not admin');
        }
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
      } catch (err) {
        next(new Error('Authorization failed'));
      }
    }).on('connection', (socket) => {
      socket.on('subscribe:metrics', () => {
        socket.join('admin:metrics');
      });
    });
  }

  /**
   * Broadcast transaction update to tanda
   */
  broadcastTransactionUpdate(tandaId, transaction) {
    this.io.to(`tanda:${tandaId}`).emit('transaction:new', {
      tandaId,
      transaction,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast balance update to user
   */
  broadcastBalanceUpdate(userId, balance) {
    this.io.to(`user:${userId}`).emit('balance:updated', {
      balance,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast tanda status update
   */
  broadcastTandaStatusUpdate(tandaId, status) {
    this.io.to(`tanda:${tandaId}`).emit('tanda:status-changed', {
      tandaId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast admin notification
   */
  broadcastAdminNotification(notification) {
    this.io.to('admin:notifications').emit('admin:notification', {
      notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast metrics to admins
   */
  broadcastMetrics(metrics) {
    this.io.of('/admin').to('admin:metrics').emit('metrics:update', {
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.io.engine.clientsCount;
  }

  /**
   * Get users in a specific tanda
   */
  getTandaUsers(tandaId) {
    const room = this.io.sockets.adapter.rooms.get(`tanda:${tandaId}`);
    return room ? room.size : 0;
  }

  /**
   * Start server
   */
  listen(port) {
    this.server.listen(port, () => {
      logger.info(`WebSocket server running on port ${port}`);
    });
    return this.server;
  }
}

module.exports = WebSocketServer;

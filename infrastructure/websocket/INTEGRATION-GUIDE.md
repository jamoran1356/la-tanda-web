# 🔗 WebSocket Integration Guide

**Quick guide for integrating WebSocket real-time updates into La Tanda services.**

---

## 1. Server Setup

### app.js
```javascript
const express = require('express');
const WebSocketServer = require('./infrastructure/websocket/server');

const app = express();
const wsServer = new WebSocketServer(app);

// Start both HTTP and WebSocket
wsServer.listen(process.env.WEBSOCKET_PORT || 3001);
app.listen(process.env.PORT || 3000);
```

---

## 2. Emit Events from Services

### Transaction Service
```javascript
const { wsServer } = require('../websocket/server');

async function createTransaction(data) {
  const transaction = await Transaction.create(data);
  const balance = await User.getBalance(data.userId);

  // Emit real-time updates
  wsServer.broadcastTransactionUpdate(data.tandaId, transaction);
  wsServer.broadcastBalanceUpdate(data.userId, balance);

  return transaction;
}
```

### Tanda Service
```javascript
async function updateTandaStatus(tandaId, newStatus) {
  const tanda = await Tanda.update(tandaId, { status: newStatus });
  
  // Broadcast status change
  wsServer.broadcastTandaStatusUpdate(tandaId, newStatus);
  
  return tanda;
}
```

---

## 3. Frontend Integration

### React Component
```jsx
import { useEffect, useState } from 'react';
import WebSocketClient from '@/infrastructure/websocket/client';

function TransactionsList() {
  const [transactions, setTransactions] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // Initialize WebSocket
    const wsClient = new WebSocketClient();
    wsClient.connect(localStorage.getItem('token'));
    
    wsClient.joinUser();
    wsClient.subscribeTanda('current-tanda-id');

    // Listen for real-time updates
    wsClient.onTransaction((data) => {
      setTransactions(prev => [data.transaction, ...prev]);
    });

    setWs(wsClient);

    return () => wsClient.disconnect();
  }, []);

  return (
    <div>
      <h2>Transactions</h2>
      {transactions.map(tx => (
        <div key={tx.id}>{tx.amount} - {tx.description}</div>
      ))}
    </div>
  );
}

export default TransactionsList;
```

---

## 4. Admin Dashboard

```jsx
function AdminDashboard() {
  const [metrics, setMetrics] = useState({});
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const wsClient = new WebSocketClient();
    wsClient.connect(localStorage.getItem('adminToken'));
    wsClient.subscribeAdmin();

    wsClient.onAdminNotif((data) => {
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        ...data.notification.metrics
      }));
    });

    setWs(wsClient);
  }, []);

  return (
    <div>
      <p>Connected Users: {metrics.activeUsers}</p>
      <p>Transactions: {metrics.transactions}</p>
    </div>
  );
}
```

---

## 5. Testing

```javascript
// test/websocket.test.js
const WebSocketClient = require('socket.io-client');
const WebSocketServer = require('../infrastructure/websocket/server');

describe('WebSocket', () => {
  it('should emit transaction updates', (done) => {
    const client = new WebSocketClient('http://localhost:3001', {
      auth: { token: validToken }
    });

    client.on('transaction:new', (data) => {
      expect(data.transaction.amount).toBe(100);
      done();
    });

    // Server broadcasts
    wsServer.broadcastTransactionUpdate('tanda-1', {
      id: '123',
      amount: 100
    });
  });
});
```

---

## 6. Environment Variables

```bash
# .env
WEBSOCKET_PORT=3001
JWT_SECRET=your-secret
FRONTEND_URL=http://localhost:3000
SOCKET_IO_REDIS_URL=redis://localhost:6379  # Optional
```

---

## 7. Troubleshooting

**Connection Refused:**
- Ensure WebSocket server is running on correct port
- Check CORS configuration
- Verify JWT token is valid

**Events Not Received:**
- Subscribe to correct room/tanda
- Check user role for admin events
- Verify broadcast is called after event

**Disconnecting Frequently:**
- Check network stability
- Increase reconnection timeout
- Monitor server logs

---

**Ready to integrate?** Start with step 1 in your app.js!

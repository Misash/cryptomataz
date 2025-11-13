# Transaction Event System

## Overview

The transaction event system allows you to **emit, listen to, and query** transaction hash events in real-time. All on-chain transactions are automatically tracked and can be monitored.

## How It Works

1. **Automatic Emission**: When a transaction completes or fails, an event is automatically emitted
2. **Event Storage**: Events are stored in memory (last 1000 events)
3. **Real-time Streaming**: Listen to events as they happen via Server-Sent Events (SSE)
4. **Query API**: Query events by transaction hash, trade ID, type, or time range

## Event Types

- `transaction.completed` - Transaction successfully completed on-chain
- `transaction.failed` - Transaction failed
- `transaction.pending` - Transaction is pending (future use)

## Event Structure

```typescript
{
  id: string;                    // Unique event ID
  type: 'transaction.completed' | 'transaction.failed' | 'transaction.pending';
  tradeId: string;               // Associated trade ID
  transactionHash?: string;      // On-chain transaction hash
  network: string;                // Network (e.g., "arbitrum-sepolia")
  from: string;                  // Payer wallet address
  to: string;                    // Recipient wallet address
  amount: string;                 // USDC amount
  timestamp: Date;               // Event timestamp
  status: 'success' | 'failed' | 'pending';
  error?: string;                // Error message (if failed)
  blockNumber?: number;          // Block number (if available)
  gasUsed?: string;              // Gas used (if available)
}
```

## API Endpoints

### 1. Get All Events (with filters)

**Curator Agent (Port 3001):**
```bash
GET http://localhost:3001/events
```

**Supervisor Agent (Port 3002):**
```bash
GET http://localhost:3002/events
```

**Query Parameters:**
- `type` - Filter by event type (`transaction.completed`, `transaction.failed`, `transaction.pending`)
- `tradeId` - Filter by trade ID
- `transactionHash` - Filter by transaction hash
- `limit` - Limit results (default: 50)

**Examples:**
```bash
# Get all completed transactions
curl "http://localhost:3001/events?type=transaction.completed"

# Get events for a specific trade
curl "http://localhost:3001/events?tradeId=trade-1234567890-abc123"

# Get events for a specific transaction hash
curl "http://localhost:3001/events?transactionHash=0x1234567890abcdef..."

# Get last 100 events
curl "http://localhost:3001/events?limit=100"
```

**Response:**
```json
{
  "events": [
    {
      "id": "event-1234567890-abc123",
      "type": "transaction.completed",
      "tradeId": "trade-1234567890-abc123",
      "transactionHash": "0x1234567890abcdef...",
      "network": "arbitrum-sepolia",
      "from": "0x...",
      "to": "0x...",
      "amount": "0.001",
      "timestamp": "2025-01-15T10:30:15.000Z",
      "status": "success"
    }
  ],
  "count": 1,
  "total": 50
}
```

### 2. Get Events by Transaction Hash

```bash
GET http://localhost:3001/events/transaction/:txHash
```

**Example:**
```bash
curl http://localhost:3001/events/transaction/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### 3. Get Events by Trade ID

```bash
GET http://localhost:3001/events/trade/:tradeId
```

**Example:**
```bash
curl http://localhost:3001/events/trade/trade-1234567890-abc123
```

### 4. Get Recent Events

```bash
GET http://localhost:3001/events/recent?limit=50
```

**Example:**
```bash
curl "http://localhost:3001/events/recent?limit=20"
```

### 5. Real-Time Event Stream (Server-Sent Events)

Listen to events in real-time as they happen:

```bash
GET http://localhost:3001/events/stream
```

**JavaScript Example:**
```javascript
const eventSource = new EventSource('http://localhost:3001/events/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New transaction event:', data);
  
  if (data.type === 'transaction.completed') {
    console.log('Transaction hash:', data.transactionHash);
    console.log('View on explorer:', `https://sepolia.arbiscan.io/tx/${data.transactionHash}`);
  }
};

eventSource.onerror = (error) => {
  console.error('Event stream error:', error);
};
```

**cURL Example:**
```bash
curl -N http://localhost:3001/events/stream
```

**Python Example:**
```python
import requests
import json

url = 'http://localhost:3001/events/stream'
response = requests.get(url, stream=True)

for line in response.iter_lines():
    if line:
        data = line.decode('utf-8')
        if data.startswith('data: '):
            event = json.loads(data[6:])  # Remove 'data: ' prefix
            print(f"Event: {event}")
```

## Event Emission

Events are automatically emitted when:

1. **Transaction Completed**: After successful on-chain settlement
   - Emitted with `type: 'transaction.completed'`
   - Includes transaction hash, block info, etc.

2. **Transaction Failed**: When settlement fails
   - Emitted with `type: 'transaction.failed'`
   - Includes error reason

## Programmatic Access

You can also listen to events programmatically:

```typescript
import { transactionEventEmitter } from './agents/TransactionEventEmitter.js';

// Listen to all transaction events
transactionEventEmitter.on('transaction.completed', (event) => {
  console.log('Transaction completed:', event.transactionHash);
  console.log('Trade ID:', event.tradeId);
  console.log('Amount:', event.amount);
});

// Listen to failed transactions
transactionEventEmitter.on('transaction.failed', (event) => {
  console.error('Transaction failed:', event.error);
});

// Listen to all events (wildcard)
transactionEventEmitter.on('transaction.*', (event) => {
  console.log('Transaction event:', event.type, event.transactionHash);
});

// Get all events
const allEvents = transactionEventEmitter.getAllEvents();

// Get events by transaction hash
const events = transactionEventEmitter.getEventsByTransactionHash('0x...');

// Get events by trade ID
const tradeEvents = transactionEventEmitter.getEventsByTradeId('trade-123');
```

## Use Cases

1. **Real-time Monitoring**: Watch transactions as they complete
2. **Transaction Tracking**: Track all on-chain transactions
3. **Analytics**: Analyze transaction patterns
4. **Notifications**: Send alerts when transactions complete
5. **Audit Trail**: Maintain a complete record of all transactions

## Example: Monitor All Transactions

```bash
# Terminal 1: Start agents
npm run agents:start

# Terminal 2: Monitor events in real-time
curl -N http://localhost:3001/events/stream | jq -r '.transactionHash // empty'
```

## Example: Get Transaction Hash for a Trade

```bash
# 1. Get trade ID from trades list
TRADE_ID=$(curl -s http://localhost:3001/trades | jq -r '.[0].id')

# 2. Get transaction hash from events
curl -s "http://localhost:3001/events/trade/$TRADE_ID" | jq -r '.events[0].transactionHash'

# 3. View on explorer
TX_HASH=$(curl -s "http://localhost:3001/events/trade/$TRADE_ID" | jq -r '.events[0].transactionHash')
echo "View transaction: https://sepolia.arbiscan.io/tx/$TX_HASH"
```

## Event Storage

- **In-Memory**: Events are stored in memory (last 1000 events)
- **Automatic Cleanup**: Old events are automatically removed
- **Persistent**: For production, consider adding database storage

## Integration with Block Explorer

Each event includes the transaction hash, which can be used to view the transaction on the block explorer:

```javascript
const explorerUrl = `https://sepolia.arbiscan.io/tx/${event.transactionHash}`;
```

## Summary

✅ **Events are automatically emitted** when transactions complete/fail  
✅ **Query events** via REST API endpoints  
✅ **Listen in real-time** via Server-Sent Events  
✅ **Filter by** transaction hash, trade ID, type, or time  
✅ **Access programmatically** via the event emitter  
✅ **Transaction hashes included** in all completed events



# Trade Verification Guide

This guide explains how to verify that trades are actually happening on-chain using the built-in trade verification system.

## Overview

The trade verification system allows you to:
- ✅ Verify that transaction hashes correspond to real on-chain transactions
- ✅ Check that transfer details match trade records
- ✅ Validate transaction status and confirmations
- ✅ Get detailed transaction information from the blockchain

## How It Works

The `TradeVerifier` class:
1. Fetches transaction receipts from the blockchain
2. Parses USDC Transfer events from transaction logs
3. Validates that transfer details (from, to, amount) match the trade record
4. Checks transaction status (success/failed)
5. Provides explorer URLs for viewing transactions

## API Endpoints

### Curator Agent (Port 3001)

#### Verify a Specific Trade
```bash
curl http://localhost:3001/trades/{tradeId}/verify
```

**Response:**
```json
{
  "tradeId": "trade-1234567890-abc123",
  "trade": {
    "id": "trade-1234567890-abc123",
    "buyerId": "0x...",
    "sellerId": "0x...",
    "usdcAmount": "0.0011",
    "transactionHash": "0x...",
    "status": "completed"
  },
  "verification": {
    "isValid": true,
    "transactionHash": "0x...",
    "blockNumber": 12345678,
    "confirmations": 5,
    "from": "0x...",
    "to": "0x...",
    "amount": "0.0011",
    "explorerUrl": "https://sepolia.arbiscan.io/tx/0x..."
  }
}
```

#### Verify All Trades
```bash
curl http://localhost:3001/trades/verify/all
```

**Response:**
```json
{
  "total": 10,
  "verified": 9,
  "failed": 1,
  "verifications": [
    {
      "tradeId": "trade-1",
      "verification": {
        "isValid": true,
        ...
      }
    },
    ...
  ]
}
```

#### Get Transaction Details
```bash
curl http://localhost:3001/transaction/{txHash}
```

**Response:**
```json
{
  "hash": "0x...",
  "blockNumber": 12345678,
  "blockHash": "0x...",
  "from": "0x...",
  "to": "0x...",
  "value": "0",
  "gasUsed": "21000",
  "gasPrice": "1000000000",
  "status": 1,
  "confirmations": 5,
  "timestamp": 1234567890
}
```

#### Check Transaction Confirmation
```bash
curl http://localhost:3001/transaction/{txHash}/confirmed?confirmations=3
```

**Response:**
```json
{
  "transactionHash": "0x...",
  "isConfirmed": true,
  "requiredConfirmations": 3
}
```

### Supervisor Agent (Port 3002)

The Supervisor Agent has the same endpoints as the Curator Agent:

- `GET /trades/:tradeId/verify` - Verify a specific trade
- `GET /trades/verify/all` - Verify all trades
- `GET /transaction/:txHash` - Get transaction details
- `GET /transaction/:txHash/confirmed` - Check confirmation status

## Verification Process

When you call a verification endpoint, the system:

1. **Fetches Transaction Receipt**: Gets the transaction receipt from the blockchain
2. **Checks Transaction Status**: Verifies the transaction was successful (status = 1)
3. **Parses Transfer Events**: Finds USDC Transfer events in the transaction logs
4. **Validates Details**: Compares on-chain data with trade record:
   - `from` address matches `buyerId`
   - `to` address matches `sellerId`
   - `amount` matches or exceeds `usdcAmount`
5. **Returns Results**: Provides verification status and detailed information

## Verification Results

### Valid Trade
```json
{
  "isValid": true,
  "transactionHash": "0x...",
  "blockNumber": 12345678,
  "confirmations": 5,
  "from": "0x...",
  "to": "0x...",
  "amount": "0.0011",
  "explorerUrl": "https://sepolia.arbiscan.io/tx/0x..."
}
```

### Invalid Trade (Transaction Not Found)
```json
{
  "isValid": false,
  "transactionHash": "0x...",
  "error": "Transaction not found on-chain"
}
```

### Invalid Trade (Transaction Failed)
```json
{
  "isValid": false,
  "transactionHash": "0x...",
  "blockNumber": 12345678,
  "confirmations": 5,
  "error": "Transaction reverted or failed"
}
```

### Invalid Trade (Details Don't Match)
```json
{
  "isValid": false,
  "transactionHash": "0x...",
  "blockNumber": 12345678,
  "error": "Transfer details do not match trade record"
}
```

## Usage Examples

### Verify a Trade After Purchase
```bash
# 1. Make a credit purchase (this will return a trade ID)
TRADE_ID=$(curl -X POST http://localhost:3001/purchase \
  -H "Content-Type: application/json" \
  -d '{"buyerId":"0x...","amount":10}' | jq -r '.trade.id')

# 2. Verify the trade
curl http://localhost:3001/trades/$TRADE_ID/verify | jq
```

### Monitor All Trades
```bash
# Verify all trades and show summary
curl http://localhost:3001/trades/verify/all | jq '{
  total: .total,
  verified: .verified,
  failed: .failed,
  failed_trades: [.verifications[] | select(.verification.isValid == false) | .tradeId]
}'
```

### Check Transaction Status
```bash
# Get transaction details
TX_HASH="0x..."
curl http://localhost:3001/transaction/$TX_HASH | jq

# Check if confirmed (with 3 confirmations)
curl "http://localhost:3001/transaction/$TX_HASH/confirmed?confirmations=3" | jq
```

### View Transaction on Block Explorer
```bash
# Get verification result and extract explorer URL
EXPLORER_URL=$(curl -s http://localhost:3001/trades/$TRADE_ID/verify | jq -r '.verification.explorerUrl')
echo "View transaction at: $EXPLORER_URL"
```

## Integration with Event System

The verification system works seamlessly with the transaction event system:

1. **Transaction Events** are emitted when trades complete
2. **Verification** can be performed on any trade with a transaction hash
3. **Real-time Monitoring** can combine event streaming with periodic verification

Example workflow:
```bash
# Stream events in one terminal
curl -N http://localhost:3001/events/stream

# In another terminal, verify trades as they complete
watch -n 5 'curl -s http://localhost:3001/trades/verify/all | jq "{total, verified, failed}"'
```

## Troubleshooting

### "Trade verifier not initialized"
**Solution**: Ensure `ASSET_ADDRESS` is set in your `.env` file:
```bash
ASSET_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58Ce87AAf7
```

### "Transaction not found on-chain"
**Possible causes**:
- Transaction hasn't been mined yet (wait a few seconds)
- Transaction hash is incorrect
- Wrong network/RPC URL

**Solution**: Check the transaction hash and ensure you're using the correct RPC URL for your network.

### "No USDC Transfer event found"
**Possible causes**:
- Transaction is not a USDC transfer
- Transaction failed before emitting events
- Wrong USDC contract address

**Solution**: Verify the transaction hash on the block explorer and check that it's a USDC transfer.

### "Transfer details do not match"
**Possible causes**:
- Trade record has incorrect addresses or amounts
- Transaction is for a different trade
- Multiple transfers in one transaction

**Solution**: Compare the trade record with the on-chain transaction details.

## Best Practices

1. **Verify After Purchase**: Always verify trades after they complete
2. **Periodic Verification**: Set up a cron job to verify all trades periodically
3. **Monitor Failed Verifications**: Alert on trades that fail verification
4. **Check Confirmations**: Wait for sufficient confirmations before considering trades final
5. **Use Explorer URLs**: Always provide explorer URLs to users for transparency

## Security Considerations

- ✅ Verification is read-only (no private keys required)
- ✅ All data comes directly from the blockchain
- ✅ No trust in local trade records required
- ✅ Can verify trades from any source (not just your own system)

## Next Steps

- View transaction events: See [TRANSACTION_EVENTS.md](./TRANSACTION_EVENTS.md)
- Monitor agent network: See [AGENTS_START_GUIDE.md](./AGENTS_START_GUIDE.md)
- Test the system: See [TESTING_AGENTS.md](./TESTING_AGENTS.md)



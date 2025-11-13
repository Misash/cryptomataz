# Accessing Transaction Hashes

## Yes, Transfers Are On-Chain! ✅

When using **local settlement mode** (`SETTLEMENT_MODE=local`), all USDC transfers are executed on-chain via the `transferWithAuthorization` function on the USDC contract. Each successful transfer generates a transaction hash that is stored and can be accessed.

## How It Works

1. **Payment Verification**: The payment signature is verified
2. **On-Chain Settlement**: `transferWithAuthorization` is called on the USDC contract
3. **Transaction Hash**: The transaction hash is returned from the blockchain
4. **Storage**: The hash is stored in the trade record

## Accessing Transaction Hashes

### Method 1: Via Curator Agent API

**Get all trades with transaction hashes:**
```bash
curl http://localhost:3001/trades
```

**Get specific trade by ID:**
```bash
curl http://localhost:3001/trades/{tradeId}
```

**Example Response:**
```json
{
  "id": "trade-1234567890-abc123",
  "buyerId": "0x...",
  "sellerId": "0x...",
  "creditsAmount": 10,
  "usdcAmount": "0.001",
  "supervisorFee": "0.0001",
  "status": "completed",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "completedAt": "2025-01-15T10:30:15.000Z",
  "transactionHash": "0x1234567890abcdef...",  // ← Transaction hash here!
  "temporaryKeyId": "sk-temp-..."
}
```

### Method 2: Via Supervisor Agent API

**Get all trades:**
```bash
curl http://localhost:3002/trades
```

**Get specific trade:**
```bash
curl http://localhost:3002/trades/{tradeId}
```

### Method 3: From Payment Response

When a credit purchase is completed, the response includes settlement information:

```json
{
  "success": true,
  "task": { ... },
  "events": [ ... ],
  "settlement": {
    "success": true,
    "transaction": "0x1234567890abcdef...",  // ← Transaction hash here!
    "network": "arbitrum-sepolia",
    "payer": "0x..."
  }
}
```

### Method 4: From Task Metadata

The task metadata also includes payment receipts:

```json
{
  "task": {
    "metadata": {
      "x402.payment.receipts": [
        {
          "success": true,
          "transaction": "0x1234567890abcdef...",
          "network": "arbitrum-sepolia",
          "payer": "0x..."
        }
      ]
    }
  }
}
```

## Viewing Transactions on Block Explorer

Once you have the transaction hash, you can view it on the Arbitrum Sepolia explorer:

```
https://sepolia.arbiscan.io/tx/{transactionHash}
```

**Example:**
```
https://sepolia.arbiscan.io/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

## Settlement Modes

### Local Settlement (On-Chain) ✅

When `SETTLEMENT_MODE=local`:
- ✅ Transfers are executed on-chain
- ✅ Transaction hashes are available
- ✅ You pay gas fees
- ✅ Full control over settlement

**Configuration:**
```env
SETTLEMENT_MODE=local
PRIVATE_KEY=your_private_key_here
RPC_URL=https://arbitrum-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Facilitator Mode (May Be Off-Chain)

When using facilitator mode:
- May batch transactions
- Transaction hash may not be immediately available
- Check facilitator response for transaction details

**Configuration:**
```env
FACILITATOR_URL=https://x402.org/facilitator
# or leave unset to use default facilitator
```

## Example: Get All Completed Trades with Transaction Hashes

```bash
# Get all trades from Curator
curl http://localhost:3001/trades | jq '.[] | select(.status == "completed") | {id, transactionHash, createdAt}'
```

**Output:**
```json
{
  "id": "trade-1234567890-abc123",
  "transactionHash": "0x1234567890abcdef...",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
{
  "id": "trade-1234567891-def456",
  "transactionHash": "0xabcdef1234567890...",
  "createdAt": "2025-01-15T10:35:00.000Z"
}
```

## Transaction Details

Each transaction hash represents:
- **Function**: `transferWithAuthorization` on USDC contract
- **From**: Buyer's wallet address
- **To**: Seller's wallet address (Curator)
- **Amount**: USDC amount in micro units (e.g., 1000 = 0.001 USDC)
- **Network**: Arbitrum Sepolia (Chain ID: 421614)

## Verifying Transactions

You can verify a transaction using ethers.js:

```javascript
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
const receipt = await provider.getTransactionReceipt('0x...transactionHash...');

console.log('Status:', receipt.status === 1 ? 'Success' : 'Failed');
console.log('Block Number:', receipt.blockNumber);
console.log('Gas Used:', receipt.gasUsed.toString());
```

## Troubleshooting

### No Transaction Hash

If `transactionHash` is `null` or `undefined`:
- Check if settlement was successful (`status: "completed"`)
- Verify settlement mode is `local` (not facilitator)
- Check if transaction failed (status will be `"failed"`)
- Review agent logs for settlement errors

### Transaction Not Found on Explorer

- Wait a few seconds for block confirmation
- Verify you're using the correct explorer (Arbitrum Sepolia)
- Check if transaction was actually submitted (check logs)

## Summary

✅ **Yes, transfers are on-chain** when using local settlement  
✅ **Transaction hashes are stored** in trade records  
✅ **Access via API** endpoints on Curator (port 3001) or Supervisor (port 3002)  
✅ **View on explorer** at https://sepolia.arbiscan.io  
✅ **Included in responses** when credit purchases complete



# How to Start the Agents

## Quick Start Guide for x402 Arbitrum Agents

### Step 1: Create `.env.agents` File

Create a `.env.agents` file in the root directory (`/Users/mac/cryptomataz/x402-arbitrum/.env.agents`):

```env
# Network Configuration (Arbitrum Sepolia)
NETWORK=arbitrum-sepolia
ASSET_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58Ce87AAf7
ASSET_NAME=USDC
CHAIN_ID=421614
EXPLORER_URL=https://sepolia.arbiscan.io

# RPC Configuration (required for local settlement)
RPC_URL=https://arbitrum-sepolia.g.alchemy.com/v2/YOUR_KEY
# OR use public RPC (not recommended for production)
# RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Settlement Mode (recommended for Arbitrum Sepolia)
SETTLEMENT_MODE=local

# Facilitator Configuration (optional - only if not using local settlement)
# FACILITATOR_URL=https://x402.org/facilitator
# FACILITATOR_API_KEY=your_api_key_if_required

# Agent Private Keys
# Each agent needs its own private key
# Generate them using: node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
SUPERVISOR_PRIVATE_KEY=0xYourSupervisorPrivateKeyHere
CURATOR_PRIVATE_KEY=0xYourCuratorPrivateKeyHere
RESEARCHER_PRIVATE_KEY=0xYourResearcherPrivateKeyHere

# Optional: Debug logging
X402_DEBUG=true
```

### Step 2: Generate Private Keys

You need 3 separate wallet private keys (one for each agent). Generate them:

```bash
cd /Users/mac/cryptomataz/x402-arbitrum
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
```

Run this command **3 times** to get 3 different private keys, then add them to `.env.agents`:
- One for `SUPERVISOR_PRIVATE_KEY`
- One for `CURATOR_PRIVATE_KEY`
- One for `RESEARCHER_PRIVATE_KEY`

### Step 3: Fund Agent Wallets

Each agent wallet needs:
- **Arbitrum Sepolia ETH** (for gas fees)
- **Arbitrum Sepolia USDC** (for payments)

**Get Arbitrum Sepolia ETH:**
- [QuickNode Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- [Chainlink Faucet](https://faucets.chain.link/arbitrum-sepolia)
- [Alchemy Faucet](https://www.alchemy.com/faucets/arbitrum-sepolia)

**Get Arbitrum Sepolia USDC:**
- Bridge from Ethereum Sepolia
- Use a DEX if available
- Some testnet faucets provide USDC

**Important:** Make sure to set USDC approval for transfers before making payments!

### Step 4: Build the Project

```bash
cd /Users/mac/cryptomataz/x402-arbitrum
npm install
npm run build
```

### Step 5: Start the Agents

```bash
npm run agents:start
```

Or for development with auto-rebuild:

```bash
npm run agents:dev
```

## What Happens When Agents Start

1. **Supervisor Agent** starts on port **3002**
   - Monitors all agents
   - Approves credit trades
   - Logs all transactions

2. **Curator Agent** starts on port **3001**
   - Sells OpenAI credits to other agents
   - Waits for credit purchase requests
   - Generates temporary API keys after payment

3. **Researcher Agent** (client only, no server)
   - Monitors its own credit balance
   - Automatically purchases credits from Curator when balance < 5
   - Uses purchased credits for operations

## Verify Agents Are Running

### Check Agent Health

```bash
# Supervisor
curl http://localhost:3002/health

# Curator
curl http://localhost:3001/health
```

### View Registered Agents

```bash
curl http://localhost:3002/agents
```

### View Trades

```bash
# List all trades
curl http://localhost:3002/trades

# Get specific trade
curl http://localhost:3002/trades/{tradeId}
```

## Testing the Credit Purchase Flow

The Researcher agent will automatically purchase credits when its balance drops below 5. You can also test manually:

1. The Researcher monitors its credit balance every 5 minutes
2. When balance < 5, it automatically requests credits from Curator
3. Curator returns payment requirements (x402 format)
4. Researcher signs payment and submits it
5. Curator verifies payment, generates temporary key, and settles on-chain
6. Researcher receives temporary key and updates balance

## Troubleshooting

### "SUPERVISOR_PRIVATE_KEY is required"
- Make sure `.env.agents` file exists
- Check that all private keys are set

### "Port already in use"
- Check if ports 3001 or 3002 are already in use
- Kill existing processes: `lsof -ti:3001 | xargs kill` or `lsof -ti:3002 | xargs kill`

### Payment verification fails
- Ensure wallets have Arbitrum Sepolia ETH for gas
- Ensure wallets have Arbitrum Sepolia USDC
- Verify USDC approval is set
- Check RPC URL is correct and accessible

### Agents not connecting
- Verify all agents are running
- Check network configuration matches (arbitrum-sepolia)
- Verify RPC URL is accessible

## Agent Endpoints

### Supervisor (Port 3002)
- `GET /health` - Health check
- `GET /agents` - List all agents
- `GET /agents/:agentId` - Get agent status
- `GET /trades` - List all trades
- `GET /trades/:tradeId` - Get trade details

### Curator (Port 3001)
- `GET /health` - Health check
- `POST /process` - Purchase credits (x402 payment endpoint)
- `GET /trades` - List all trades
- `GET /trades/:tradeId` - Get trade details

## Next Steps

- Monitor agent logs for detailed information
- Check Supervisor dashboard at http://localhost:3002
- View trades at http://localhost:3002/trades
- Test credit purchase flow
- Integrate real OpenAI API key management



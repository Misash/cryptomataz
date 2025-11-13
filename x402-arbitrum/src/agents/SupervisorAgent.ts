import express, { Express } from 'express';
import { AgentBase } from './AgentBase.js';
import { transactionEventEmitter } from './TransactionEventEmitter.js';
import { TradeVerifier } from './TradeVerifier.js';
import type { Network } from 'x402/types';
import type { AgentStatus, CreditTrade, TradeApproval } from './types.js';

/**
 * Supervisor Agent - Monitors and coordinates the agent network
 * - Monitors agent credit balances
 * - Approves credit trades
 * - Enforces trade limits
 * - Logs all transactions
 */
export class SupervisorAgent extends AgentBase {
  private app: Express;
  private tradeVerifier?: TradeVerifier;
  private port: number;
  private agentStatuses: Map<string, AgentStatus> = new Map();
  private trades: Map<string, CreditTrade> = new Map();
  private approvals: Map<string, TradeApproval> = new Map();
  private readonly maxCreditsPerTrade = 20;
  private readonly supervisorFeePercent = 10; // 10% fee

  constructor(
    privateKey: string,
    network: Network,
    port: number = 3002,
    rpcUrl?: string
  ) {
    super('Supervisor', privateKey, network, rpcUrl);

    this.port = port;
    this.app = express();
    this.app.use(express.json());

    // Initialize trade verifier if USDC address is available
    const usdcAddress = process.env.ASSET_ADDRESS;
    if (usdcAddress) {
      const verifierRpcUrl = rpcUrl || this.getDefaultRpcUrl(network);
      if (verifierRpcUrl) {
        this.tradeVerifier = new TradeVerifier(network, verifierRpcUrl, usdcAddress);
      }
    }

    this.setupRoutes();
    this.startMonitoring();
  }

  private getDefaultRpcUrl(network: Network): string | undefined {
    const rpcUrls: Record<string, string> = {
      'base-sepolia': 'https://sepolia.base.org',
      'base': 'https://mainnet.base.org',
      'polygon-amoy': 'https://rpc-amoy.polygon.technology',
      'polygon': 'https://polygon-rpc.com',
      'arbitrum-sepolia': 'https://sepolia-rollup.arbitrum.io/rpc',
      'arbitrum': 'https://arb1.arbitrum.io/rpc',
    };
    return rpcUrls[network as string];
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        agent: 'Supervisor',
        wallet: this.walletAddress,
        network: this.network,
        activeAgents: this.agentStatuses.size,
        totalTrades: this.trades.size,
      });
    });

    // Register agent
    this.app.post('/agents/register', (req, res) => {
      const { agentId, name, walletAddress } = req.body;

      if (!agentId || !name || !walletAddress) {
        return res.status(400).json({
          error: 'Missing required fields: agentId, name, walletAddress',
        });
      }

      const status: AgentStatus = {
        agentId,
        name,
        walletAddress,
        openaiCredits: 0,
        usdcBalance: '0',
        ethBalance: '0',
        status: 'active',
        lastActivity: new Date(),
      };

      this.agentStatuses.set(agentId, status);
      this.log(`Registered agent: ${name} (${agentId})`);

      res.json({ success: true, agent: status });
    });

    // Update agent status
    this.app.post('/agents/:agentId/status', async (req, res) => {
      const { agentId } = req.params;
      const status = this.agentStatuses.get(agentId);

      if (!status) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Update status
      if (req.body.openaiCredits !== undefined) {
        status.openaiCredits = req.body.openaiCredits;
      }
      if (req.body.usdcBalance !== undefined) {
        status.usdcBalance = req.body.usdcBalance;
      }
      if (req.body.ethBalance !== undefined) {
        status.ethBalance = req.body.ethBalance;
      }
      if (req.body.status) {
        status.status = req.body.status;
      }
      status.lastActivity = new Date();

      this.agentStatuses.set(agentId, status);
      res.json({ success: true, agent: status });
    });

    // Request trade approval
    this.app.post('/trades/approve', (req, res) => {
      const { tradeId, buyerId, sellerId, creditsAmount, usdcAmount } = req.body;

      if (!tradeId || !buyerId || !sellerId || !creditsAmount) {
        return res.status(400).json({
          error: 'Missing required fields: tradeId, buyerId, sellerId, creditsAmount',
        });
      }

      // Check trade limits
      if (creditsAmount > this.maxCreditsPerTrade) {
        const approval: TradeApproval = {
          tradeId,
          approved: false,
          reason: `Trade exceeds maximum credits per trade (${this.maxCreditsPerTrade})`,
          supervisorId: this.walletAddress,
          timestamp: new Date(),
        };

        this.approvals.set(tradeId, approval);
        return res.json({ approval });
      }

      // Check agent statuses
      const buyer = this.agentStatuses.get(buyerId);
      const seller = this.agentStatuses.get(sellerId);

      if (!buyer || buyer.status !== 'active') {
        const approval: TradeApproval = {
          tradeId,
          approved: false,
          reason: 'Buyer agent not found or inactive',
          supervisorId: this.walletAddress,
          timestamp: new Date(),
        };

        this.approvals.set(tradeId, approval);
        return res.json({ approval });
      }

      if (!seller || seller.status !== 'active') {
        const approval: TradeApproval = {
          tradeId,
          approved: false,
          reason: 'Seller agent not found or inactive',
          supervisorId: this.walletAddress,
          timestamp: new Date(),
        };

        this.approvals.set(tradeId, approval);
        return res.json({ approval });
      }

      // Calculate supervisor fee
      const usdcAmountNum = parseFloat(usdcAmount || '0.001');
      const supervisorFee = (usdcAmountNum * this.supervisorFeePercent) / 100;

      // Approve trade
      const approval: TradeApproval = {
        tradeId,
        approved: true,
        supervisorId: this.walletAddress,
        timestamp: new Date(),
      };

      this.approvals.set(tradeId, approval);

      // Create trade record
      const trade: CreditTrade = {
        id: tradeId,
        buyerId,
        sellerId,
        creditsAmount,
        usdcAmount: usdcAmount || '0.001',
        supervisorFee: supervisorFee.toFixed(6),
        status: 'approved',
        createdAt: new Date(),
      };

      this.trades.set(tradeId, trade);

      this.log(`✅ Approved trade: ${tradeId} (${creditsAmount} credits)`);

      res.json({ approval, trade });
    });

    // Get agent status
    this.app.get('/agents/:agentId', (req, res) => {
      const status = this.agentStatuses.get(req.params.agentId);
      if (!status) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(status);
    });

    // List all agents
    this.app.get('/agents', (req, res) => {
      res.json(Array.from(this.agentStatuses.values()));
    });

    // Get trade
    this.app.get('/trades/:tradeId', (req, res) => {
      const trade = this.trades.get(req.params.tradeId);
      if (!trade) {
        return res.status(404).json({ error: 'Trade not found' });
      }
      res.json(trade);
    });

    // List all trades
    this.app.get('/trades', (req, res) => {
      res.json(Array.from(this.trades.values()));
    });

    // Get transaction events (same as Curator)
    this.app.get('/events', (req, res) => {
      const type = req.query.type as string | undefined;
      const tradeId = req.query.tradeId as string | undefined;
      const txHash = req.query.transactionHash as string | undefined;
      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;

      let events = transactionEventEmitter.getAllEvents();

      // Filter by type
      if (type) {
        events = events.filter((e) => e.type === type);
      }

      // Filter by trade ID
      if (tradeId) {
        events = events.filter((e) => e.tradeId === tradeId);
      }

      // Filter by transaction hash
      if (txHash) {
        events = events.filter((e) => e.transactionHash === txHash);
      }

      // Sort by timestamp (newest first) and limit
      events = events
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      res.json({
        events,
        count: events.length,
        total: transactionEventEmitter.getAllEvents().length,
      });
    });

    // Get events by transaction hash
    this.app.get('/events/transaction/:txHash', (req, res) => {
      const events = transactionEventEmitter.getEventsByTransactionHash(req.params.txHash);
      res.json({
        transactionHash: req.params.txHash,
        events,
        count: events.length,
      });
    });

    // Get events by trade ID
    this.app.get('/events/trade/:tradeId', (req, res) => {
      const events = transactionEventEmitter.getEventsByTradeId(req.params.tradeId);
      res.json({
        tradeId: req.params.tradeId,
        events,
        count: events.length,
      });
    });

    // Get recent events
    this.app.get('/events/recent', (req, res) => {
      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
      const events = transactionEventEmitter.getRecentEvents(limit);
      res.json({
        events,
        count: events.length,
      });
    });

    // Real-time event stream (Server-Sent Events)
    this.app.get('/events/stream', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Event stream connected' })}\n\n`);

      // Send recent events immediately
      const recentEvents = transactionEventEmitter.getRecentEvents(10);
      recentEvents.forEach((event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      });

      // Listen for new events
      const eventHandler = (event: any) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      transactionEventEmitter.on('transaction.completed', eventHandler);
      transactionEventEmitter.on('transaction.failed', eventHandler);
      transactionEventEmitter.on('transaction.pending', eventHandler);

      // Cleanup on client disconnect
      req.on('close', () => {
        transactionEventEmitter.off('transaction.completed', eventHandler);
        transactionEventEmitter.off('transaction.failed', eventHandler);
        transactionEventEmitter.off('transaction.pending', eventHandler);
        res.end();
      });
    });

    // Verify a trade on-chain
    this.app.get('/trades/:tradeId/verify', async (req, res) => {
      if (!this.tradeVerifier) {
        return res.status(503).json({ error: 'Trade verifier not initialized. Set ASSET_ADDRESS in environment.' });
      }

      const trade = this.trades.get(req.params.tradeId);
      if (!trade) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      try {
        const verification = await this.tradeVerifier.verifyTrade(trade);
        res.json({
          tradeId: trade.id,
          trade,
          verification,
        });
      } catch (error: any) {
        res.status(500).json({
          error: error.message || 'Verification failed',
        });
      }
    });

    // Verify all trades
    this.app.get('/trades/verify/all', async (req, res) => {
      if (!this.tradeVerifier) {
        return res.status(503).json({ error: 'Trade verifier not initialized. Set ASSET_ADDRESS in environment.' });
      }

      try {
        const trades = Array.from(this.trades.values());
        const verifications = await this.tradeVerifier.verifyTrades(trades);

        const summary = {
          total: trades.length,
          verified: verifications.filter((v) => v.verification.isValid).length,
          failed: verifications.filter((v) => !v.verification.isValid).length,
          verifications,
        };

        res.json(summary);
      } catch (error: any) {
        res.status(500).json({
          error: error.message || 'Verification failed',
        });
      }
    });

    // Get transaction details from blockchain
    this.app.get('/transaction/:txHash', async (req, res) => {
      if (!this.tradeVerifier) {
        return res.status(503).json({ error: 'Trade verifier not initialized. Set ASSET_ADDRESS in environment.' });
      }

      try {
        const details = await this.tradeVerifier.getTransactionDetails(req.params.txHash);
        if (!details) {
          return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(details);
      } catch (error: any) {
        res.status(500).json({
          error: error.message || 'Failed to get transaction details',
        });
      }
    });

    // Check if transaction is confirmed
    this.app.get('/transaction/:txHash/confirmed', async (req, res) => {
      if (!this.tradeVerifier) {
        return res.status(503).json({ error: 'Trade verifier not initialized. Set ASSET_ADDRESS in environment.' });
      }

      try {
        const requiredConfirmations = req.query.confirmations
          ? Number.parseInt(req.query.confirmations as string, 10)
          : 1;
        const isConfirmed = await this.tradeVerifier.isTransactionConfirmed(
          req.params.txHash,
          requiredConfirmations
        );
        res.json({
          transactionHash: req.params.txHash,
          isConfirmed,
          requiredConfirmations,
        });
      } catch (error: any) {
        res.status(500).json({
          error: error.message || 'Failed to check confirmation',
        });
      }
    });
  }

  /**
   * Start monitoring agent balances
   */
  private startMonitoring(): void {
    // Monitor every 10 minutes
    setInterval(async () => {
      this.log('🔍 Monitoring agent balances...');

      for (const [agentId, status] of this.agentStatuses.entries()) {
        // Check if agent needs attention
        if (status.openaiCredits < 5 && status.status === 'active') {
          this.log(`⚠️  Agent ${status.name} (${agentId}) has low credits: ${status.openaiCredits}`);
        }
      }

      // Clean up old trades (older than 24 hours)
      const now = new Date();
      let cleaned = 0;
      for (const [tradeId, trade] of this.trades.entries()) {
        const age = now.getTime() - trade.createdAt.getTime();
        if (age > 24 * 60 * 60 * 1000 && trade.status === 'completed') {
          this.trades.delete(tradeId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.log(`🧹 Cleaned up ${cleaned} old trades`);
      }
    }, 10 * 60 * 1000); // 10 minutes

    this.log('✅ Monitoring started (every 10 minutes)');
  }

  /**
   * Start the Supervisor agent server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        this.log(`✅ Server running on http://localhost:${this.port}`);
        this.log(`📖 Health check: http://localhost:${this.port}/health`);
        this.log(`🚀 API endpoints available`);
        resolve();
      });
    });
  }

  /**
   * Get all agent statuses
   */
  getAgentStatuses(): AgentStatus[] {
    return Array.from(this.agentStatuses.values());
  }

  /**
   * Get all trades
   */
  getTrades(): CreditTrade[] {
    return Array.from(this.trades.values());
  }
}


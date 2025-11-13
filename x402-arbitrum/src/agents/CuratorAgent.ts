import express, { Express } from 'express';
import { AgentBase } from './AgentBase.js';
import { MerchantExecutor, type MerchantExecutorOptions } from '../MerchantExecutor.js';
import { CreditSharingService } from './CreditSharingService.js';
import { transactionEventEmitter } from './TransactionEventEmitter.js';
import { TradeVerifier } from './TradeVerifier.js';
import type { Network, PaymentPayload } from 'x402/types';
import {
  EventQueue,
  Message,
  RequestContext,
  Task,
  TaskState,
} from '../x402Types.js';
import type { CreditTrade } from './types.js';

/**
 * Curator Agent - Sells OpenAI credits to other agents via x402
 * Acts as a merchant API using the x402 payment protocol
 */
export class CuratorAgent extends AgentBase {
  private app: Express;
  private merchantExecutor: MerchantExecutor;
  private creditService: CreditSharingService;
  private tradeVerifier: TradeVerifier;
  private port: number;
  private trades: Map<string, CreditTrade> = new Map();

  constructor(
    privateKey: string,
    network: Network,
    port: number = 3001,
    rpcUrl?: string,
    facilitatorUrl?: string
  ) {
    super('Curator', privateKey, network, rpcUrl);

    this.port = port;
    this.app = express();
    this.app.use(express.json());

    // Initialize credit sharing service
    this.creditService = new CreditSharingService();

    // Initialize merchant executor for x402 payments
    const merchantOptions: MerchantExecutorOptions = {
      payToAddress: this.walletAddress,
      network,
      price: 0.0011, // 0.001 USDC + 0.0001 supervisor fee
      facilitatorUrl,
      resourceUrl: `http://localhost:${port}/process`,
      settlementMode: facilitatorUrl ? 'facilitator' : 'direct',
      rpcUrl,
      privateKey,
    };

    this.merchantExecutor = new MerchantExecutor(merchantOptions);

    // Initialize trade verifier
    const usdcAddress = this.merchantExecutor.getPaymentRequirements().asset;
    const verifierRpcUrl = rpcUrl || this.getDefaultRpcUrl(network);
    if (!verifierRpcUrl) {
      throw new Error(`RPC URL required for trade verification on network ${network}`);
    }
    this.tradeVerifier = new TradeVerifier(network, verifierRpcUrl, usdcAddress);

    this.setupRoutes();
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
        agent: 'Curator',
        wallet: this.walletAddress,
        network: this.network,
        price: '$0.0011 USDC per 10 credits',
      });
    });

    // Main endpoint for credit purchases
    this.app.post('/process', async (req, res) => {
      try {
        this.log('📥 Received credit purchase request');

        const { message, taskId, contextId, metadata } = req.body;

        if (!message) {
          return res.status(400).json({
            error: 'Missing message in request body',
          });
        }

        // Create task
        const task: Task = {
          id: taskId || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          contextId: contextId || `context-${Date.now()}`,
          status: {
            state: TaskState.INPUT_REQUIRED,
            message: message,
          },
          metadata: metadata || {},
        };

        const context: RequestContext = {
          taskId: task.id,
          contextId: task.contextId,
          currentTask: task,
          message: message,
        };

        const events: Task[] = [];
        const eventQueue: EventQueue = {
          enqueueEvent: async (event: Task) => {
            events.push(event);
          },
        };

        const paymentPayload = message.metadata?.['x402.payment.payload'] as
          | PaymentPayload
          | undefined;
        const paymentStatus = message.metadata?.['x402.payment.status'];

        // Check if payment is required
        if (!paymentPayload || paymentStatus !== 'payment-submitted') {
          const paymentRequired = this.merchantExecutor.createPaymentRequiredResponse();

          const responseMessage: Message = {
            messageId: `msg-${Date.now()}`,
            role: 'agent',
            parts: [
              {
                kind: 'text',
                text: 'Payment required to purchase OpenAI credits. Please submit payment to continue.',
              },
            ],
            metadata: {
              'x402.payment.required': paymentRequired,
              'x402.payment.status': 'payment-required',
            },
          };

          task.status.state = TaskState.INPUT_REQUIRED;
          task.status.message = responseMessage;
          task.metadata = {
            ...(task.metadata || {}),
            'x402.payment.required': paymentRequired,
            'x402.payment.status': 'payment-required',
          };

          events.push(task);
          this.log('💰 Payment required for credit purchase');

          return res.json({
            success: false,
            error: 'Payment Required',
            task,
            events,
          });
        }

        // Verify payment
        const verifyResult = await this.merchantExecutor.verifyPayment(paymentPayload);

        if (!verifyResult.isValid) {
          const errorReason = verifyResult.invalidReason || 'Invalid payment';
          task.status.state = TaskState.FAILED;
          task.status.message = {
            messageId: `msg-${Date.now()}`,
            role: 'agent',
            parts: [
              {
                kind: 'text',
                text: `Payment verification failed: ${errorReason}`,
              },
            ],
            metadata: {
              'x402.payment.status': 'payment-rejected',
              'x402.payment.error': errorReason,
            },
          };

          events.push(task);

          return res.status(402).json({
            error: 'Payment verification failed',
            reason: errorReason,
            task,
            events,
          });
        }

        // Create trade record
        const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const buyerAddress = verifyResult.payer || 'unknown';
        const creditsAmount = 10; // MVP: fixed 10 credits per trade

        const trade: CreditTrade = {
          id: tradeId,
          buyerId: buyerAddress,
          sellerId: this.walletAddress,
          creditsAmount,
          usdcAmount: '0.001',
          supervisorFee: '0.0001',
          status: 'approved',
          createdAt: new Date(),
        };

        this.trades.set(tradeId, trade);
        task.metadata = {
          ...(task.metadata || {}),
          'trade.id': tradeId,
          'credits.requested': creditsAmount,
          'x402.payment.status': 'payment-verified',
          'x402.payment.payer': buyerAddress,
        };

        // Generate temporary key
        await this.creditService.execute(context, eventQueue);

        // Settle payment
        const settlement = await this.merchantExecutor.settlePayment(paymentPayload);

        // Update trade status
        if (settlement.success) {
          trade.status = 'completed';
          trade.completedAt = new Date();
          trade.transactionHash = settlement.transaction;
          const finalTask = events[events.length - 1];
          if (finalTask?.metadata?.['temporary.key']) {
            trade.temporaryKeyId = finalTask.metadata['temporary.key'].id;
          }
          this.trades.set(tradeId, trade);

          // Emit transaction completed event
          transactionEventEmitter.emitTransactionEvent({
            type: 'transaction.completed',
            tradeId: trade.id,
            transactionHash: settlement.transaction,
            network: this.network,
            from: buyerAddress,
            to: this.walletAddress,
            amount: trade.usdcAmount,
            status: 'success',
          });
        } else {
          trade.status = 'failed';
          this.trades.set(tradeId, trade);

          // Emit transaction failed event
          transactionEventEmitter.emitTransactionEvent({
            type: 'transaction.failed',
            tradeId: trade.id,
            network: this.network,
            from: buyerAddress,
            to: this.walletAddress,
            amount: trade.usdcAmount,
            status: 'failed',
            error: settlement.errorReason,
          });
        }

        // Update task metadata with settlement
        const finalTask = events[events.length - 1];
        if (finalTask) {
          finalTask.metadata = {
            ...(finalTask.metadata || {}),
            'x402.payment.status': settlement.success ? 'payment-completed' : 'payment-failed',
            ...(settlement.transaction
              ? { 'x402.payment.receipts': [settlement] }
              : {}),
            ...(settlement.errorReason
              ? { 'x402.payment.error': settlement.errorReason }
              : {}),
          };
        }

        this.log('📤 Sending response with temporary key');

        return res.json({
          success: settlement.success,
          task: events[events.length - 1],
          events,
          settlement,
        });
      } catch (error: any) {
        this.error('Error processing request:', error);
        return res.status(500).json({
          error: error.message || 'Internal server error',
        });
      }
    });

    // Get trade status
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

    // Get transaction events
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
   * Start the Curator agent server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        this.log(`✅ Server running on http://localhost:${this.port}`);
        this.log(`📖 Health check: http://localhost:${this.port}/health`);
        this.log(`🚀 Credit purchase endpoint: POST http://localhost:${this.port}/process`);
        resolve();
      });
    });
  }

  /**
   * Get all trades
   */
  getTrades(): CreditTrade[] {
    return Array.from(this.trades.values());
  }

  /**
   * Cleanup expired keys
   */
  cleanupKeys(): number {
    return this.creditService.cleanupExpiredKeys();
  }
}


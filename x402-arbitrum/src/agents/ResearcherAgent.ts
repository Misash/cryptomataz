import { AgentBase } from './AgentBase.js';
import { Wallet, getAddress } from 'ethers';
import type { Network, PaymentPayload, PaymentRequirements } from 'x402/types';
import { Message } from '../x402Types.js';
import { randomBytes } from 'crypto';
import type { TemporaryOpenAIKey } from './types.js';

const TRANSFER_AUTH_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

const CHAIN_IDS: Record<string, number> = {
  base: 8453,
  'base-sepolia': 84532,
  arbitrum: 42161,
  'arbitrum-sepolia': 421614,
  polygon: 137,
  'polygon-amoy': 80002,
};

/**
 * Researcher Agent - Buys OpenAI credits from Curator via x402
 * Acts as an x402 client that monitors credit balance and purchases when needed
 */
export class ResearcherAgent extends AgentBase {
  private curatorUrl: string;
  private openaiCredits: number = 0; // Current credit balance
  private temporaryKeys: Map<string, TemporaryOpenAIKey> = new Map();
  private readonly minCreditsThreshold = 5; // Purchase when credits < 5

  constructor(
    privateKey: string,
    network: Network,
    curatorUrl: string,
    rpcUrl?: string
  ) {
    super('Researcher', privateKey, network, rpcUrl);
    this.curatorUrl = curatorUrl;
  }

  /**
   * Get current OpenAI credit balance
   */
  getCreditBalance(): number {
    return this.openaiCredits;
  }

  /**
   * Set OpenAI credit balance (called by monitoring system)
   */
  setCreditBalance(credits: number): void {
    this.openaiCredits = credits;
    this.log(`Credit balance updated: ${credits} credits`);
  }

  /**
   * Check if credits need to be purchased
   */
  needsCredits(): boolean {
    return this.openaiCredits < this.minCreditsThreshold;
  }

  /**
   * Purchase credits from Curator agent
   */
  async purchaseCredits(creditsAmount: number = 10): Promise<TemporaryOpenAIKey | null> {
    if (!this.needsCredits()) {
      this.log('Sufficient credits available, no purchase needed');
      return null;
    }

    this.log(`💰 Purchasing ${creditsAmount} credits from Curator...`);

    try {
      // Step 1: Request credits (will get payment requirement)
      const message: Message = {
        messageId: `msg-${Date.now()}`,
        role: 'user',
        parts: [
          {
            kind: 'text',
            text: `Request to purchase ${creditsAmount} OpenAI credits`,
          },
        ],
        metadata: {
          'credits.requested': creditsAmount,
        },
      };

      const initialResponse = await fetch(`${this.curatorUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const initialData = await initialResponse.json() as any;

      // Check for payment requirement
      const paymentRequired = 
        initialData.task?.status?.message?.metadata?.['x402.payment.required'] ||
        initialData.x402;

      if (!paymentRequired) {
        this.error('No payment requirement received from Curator');
        return null;
      }

      this.log('💳 Payment required, signing authorization...');

      // Step 2: Create and sign payment
      const paymentPayload = await this.createPaymentPayload(paymentRequired);

      // Step 3: Submit payment with request
      const taskId = initialData.task?.id || `task-${Date.now()}`;
      const contextId = initialData.task?.contextId || `context-${Date.now()}`;

      const paidMessage: Message = {
        messageId: `msg-${Date.now()}`,
        role: 'user',
        parts: [
          {
            kind: 'text',
            text: `Request to purchase ${creditsAmount} OpenAI credits`,
          },
        ],
        metadata: {
          'x402.payment.payload': paymentPayload,
          'x402.payment.status': 'payment-submitted',
          'credits.requested': creditsAmount,
        },
      };

      const paidResponse = await fetch(`${this.curatorUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: paidMessage,
          taskId,
          contextId,
        }),
      });

      const paidData = await paidResponse.json() as any;

      if (!paidResponse.ok || !paidData.success) {
        this.error('Credit purchase failed:', paidData.error);
        return null;
      }

      // Extract temporary key from response
      const tempKeyData = paidData.task?.metadata?.['temporary.key'];
      if (!tempKeyData) {
        this.error('No temporary key received in response');
        return null;
      }

      // Convert expiresAt from string to Date if needed (JSON serialization converts Date to string)
      const tempKey: TemporaryOpenAIKey = {
        ...tempKeyData,
        expiresAt: tempKeyData.expiresAt instanceof Date 
          ? tempKeyData.expiresAt 
          : new Date(tempKeyData.expiresAt),
      };
      
      this.temporaryKeys.set(tempKey.id, tempKey);
      this.openaiCredits += tempKey.creditsLimit;

      this.log(`✅ Credits purchased successfully!`);
      this.log(`   Key ID: ${tempKey.id}`);
      this.log(`   Credits: ${tempKey.creditsLimit}`);
      this.log(`   Expires: ${tempKey.expiresAt}`);
      this.log(`   New balance: ${this.openaiCredits} credits`);

      return tempKey;
    } catch (error: any) {
      this.error('Error purchasing credits:', error);
      return null;
    }
  }

  /**
   * Create payment payload by signing EIP-712 authorization
   */
  private async createPaymentPayload(
    paymentRequired: any
  ): Promise<PaymentPayload> {
    const requirement = this.selectPaymentRequirement(paymentRequired);

    const now = Math.floor(Date.now() / 1000);
    // Normalize addresses to lowercase first, then checksum (handles any casing)
    const authorization = {
      from: getAddress(this.walletAddress.toLowerCase()), // Ensure proper checksum
      to: getAddress(requirement.payTo.toLowerCase()), // Ensure proper checksum
      value: requirement.maxAmountRequired,
      validAfter: '0',
      validBefore: String(now + requirement.maxTimeoutSeconds),
      nonce: this.generateNonce(),
    };

    const domain = {
      name: requirement.extra?.name || 'USDC',
      version: requirement.extra?.version || '2',
      chainId: this.getChainId(requirement.network),
      verifyingContract: getAddress(requirement.asset.toLowerCase()), // Ensure proper checksum
    };

    const signature = await this.wallet.signTypedData(
      domain,
      TRANSFER_AUTH_TYPES,
      authorization
    );

    return {
      x402Version: paymentRequired.x402Version ?? 1,
      scheme: requirement.scheme,
      network: requirement.network,
      payload: {
        signature,
        authorization,
      },
    };
  }

  private selectPaymentRequirement(paymentRequired: any): PaymentRequirements {
    const accepts = paymentRequired?.accepts;
    if (!Array.isArray(accepts) || accepts.length === 0) {
      throw new Error('No payment requirements provided');
    }
    return accepts[0] as PaymentRequirements;
  }

  private generateNonce(): string {
    return `0x${randomBytes(32).toString('hex')}`;
  }

  private getChainId(network: string): number {
    const chainId = CHAIN_IDS[network];
    if (!chainId) {
      throw new Error(`Unsupported network "${network}"`);
    }
    return chainId;
  }

  /**
   * Get active temporary keys
   */
  getActiveKeys(): TemporaryOpenAIKey[] {
    const now = new Date();
    return Array.from(this.temporaryKeys.values()).filter(
      (key) => !key.revoked && key.expiresAt > now
    );
  }

  /**
   * Use credits (simulate OpenAI API usage)
   */
  useCredits(amount: number): boolean {
    if (this.openaiCredits < amount) {
      this.log(`⚠️  Insufficient credits. Need ${amount}, have ${this.openaiCredits}`);
      return false;
    }

    this.openaiCredits -= amount;
    this.log(`Used ${amount} credits. Remaining: ${this.openaiCredits}`);
    return true;
  }

  /**
   * Monitor and auto-purchase credits if needed
   */
  async monitorAndPurchase(): Promise<void> {
    if (this.needsCredits()) {
      this.log('⚠️  Low credit balance detected, purchasing credits...');
      await this.purchaseCredits();
    }
  }
}


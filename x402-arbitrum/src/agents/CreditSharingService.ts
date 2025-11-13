import { EventQueue, RequestContext, TaskState } from '../x402Types.js';
import type { TemporaryOpenAIKey } from './types.js';
import crypto from 'crypto';

/**
 * Service that manages temporary OpenAI API key sharing
 * This replaces ExampleService for the Curator agent
 */
export class CreditSharingService {
  private temporaryKeys: Map<string, TemporaryOpenAIKey> = new Map();
  private readonly keyExpiryMinutes = 60; // Keys expire after 1 hour
  private readonly maxCreditsPerKey = 10; // MVP: 10 credits per key

  /**
   * Generate a temporary OpenAI API key with usage limits
   * In production, this would call OpenAI API to create a restricted key
   * For MVP, we simulate this with a key identifier
   */
  async generateTemporaryKey(
    tradeId: string,
    creditsLimit: number = this.maxCreditsPerKey
  ): Promise<TemporaryOpenAIKey> {
    // Generate a unique key ID (in production, this would be an actual OpenAI key)
    const keyId = `sk-temp-${crypto.randomBytes(16).toString('hex')}`;
    
    const tempKey: TemporaryOpenAIKey = {
      id: keyId,
      key: keyId, // In production, this would be the actual OpenAI API key
      creditsLimit: Math.min(creditsLimit, this.maxCreditsPerKey),
      expiresAt: new Date(Date.now() + this.keyExpiryMinutes * 60 * 1000),
      tradeId,
      revoked: false,
    };

    this.temporaryKeys.set(keyId, tempKey);
    
    console.log(`🔑 Generated temporary key: ${keyId}`);
    console.log(`   Credits limit: ${tempKey.creditsLimit}`);
    console.log(`   Expires at: ${tempKey.expiresAt.toISOString()}`);

    return tempKey;
  }

  /**
   * Revoke a temporary key
   */
  revokeKey(keyId: string): boolean {
    const key = this.temporaryKeys.get(keyId);
    if (!key) {
      return false;
    }

    key.revoked = true;
    this.temporaryKeys.set(keyId, key);
    
    console.log(`🔒 Revoked temporary key: ${keyId}`);
    return true;
  }

  /**
   * Get key information
   */
  getKey(keyId: string): TemporaryOpenAIKey | undefined {
    return this.temporaryKeys.get(keyId);
  }

  /**
   * Clean up expired keys
   */
  cleanupExpiredKeys(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [keyId, key] of this.temporaryKeys.entries()) {
      if (key.expiresAt < now || key.revoked) {
        this.temporaryKeys.delete(keyId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired/revoked keys`);
    }

    return cleaned;
  }

  /**
   * Execute the credit sharing service
   * This is called after payment verification
   */
  async execute(context: RequestContext, eventQueue: EventQueue): Promise<void> {
    const task = context.currentTask;

    if (!task) {
      throw new Error('No task found in context');
    }

    console.log('✅ Payment verified, generating temporary OpenAI key...');

    // Extract trade information from metadata
    const tradeId = task.metadata?.['trade.id'] as string;
    const creditsRequested = (task.metadata?.['credits.requested'] as number) || 10;

    if (!tradeId) {
      throw new Error('Trade ID is required');
    }

    // Generate temporary key
    const tempKey = await this.generateTemporaryKey(tradeId, creditsRequested);

    // Update task with key information
    task.status.state = TaskState.COMPLETED;
    task.status.message = {
      messageId: `msg-${Date.now()}`,
      role: 'agent',
      parts: [
        {
          kind: 'text',
          text: `Temporary OpenAI key generated. Key ID: ${tempKey.id}, Credits: ${tempKey.creditsLimit}, Expires: ${tempKey.expiresAt.toISOString()}`,
        },
      ],
      metadata: {
        'temporary.key.id': tempKey.id,
        'temporary.key.credits': tempKey.creditsLimit,
        'temporary.key.expires': tempKey.expiresAt.toISOString(),
        'trade.id': tradeId,
      },
    };

    task.metadata = {
      ...(task.metadata || {}),
      'temporary.key': tempKey,
      'trade.id': tradeId,
    };

    await eventQueue.enqueueEvent(task);

    console.log('✨ Temporary key generated and provided');
  }
}



import { EventEmitter } from 'events';
import type { CreditTrade } from './types.js';

/**
 * Transaction event types
 */
export interface TransactionEvent {
  id: string;
  type: 'transaction.completed' | 'transaction.failed' | 'transaction.pending';
  tradeId: string;
  transactionHash?: string;
  network: string;
  from: string;
  to: string;
  amount: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  blockNumber?: number;
  gasUsed?: string;
}

/**
 * Event emitter for transaction events
 * Allows agents to emit and listen to transaction events
 */
export class TransactionEventEmitter extends EventEmitter {
  private events: TransactionEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events

  /**
   * Emit a transaction event
   */
  emitTransactionEvent(event: Omit<TransactionEvent, 'id' | 'timestamp'>): void {
    const fullEvent: TransactionEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    // Store event
    this.events.push(fullEvent);

    // Keep only last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Emit to listeners
    this.emit(event.type, fullEvent);
    this.emit('transaction.*', fullEvent); // Wildcard listener
  }

  /**
   * Get all events
   */
  getAllEvents(): TransactionEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: TransactionEvent['type']): TransactionEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Get events by transaction hash
   */
  getEventsByTransactionHash(transactionHash: string): TransactionEvent[] {
    return this.events.filter((e) => e.transactionHash === transactionHash);
  }

  /**
   * Get events by trade ID
   */
  getEventsByTradeId(tradeId: string): TransactionEvent[] {
    return this.events.filter((e) => e.tradeId === tradeId);
  }

  /**
   * Get recent events (last N events)
   */
  getRecentEvents(limit: number = 50): TransactionEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get events in time range
   */
  getEventsInRange(startTime: Date, endTime: Date): TransactionEvent[] {
    return this.events.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  /**
   * Clear old events (older than specified days)
   */
  clearOldEvents(daysOld: number = 7): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const initialLength = this.events.length;
    this.events = this.events.filter((e) => e.timestamp >= cutoff);
    return initialLength - this.events.length;
  }
}

// Global event emitter instance
export const transactionEventEmitter = new TransactionEventEmitter();



import { ethers } from 'ethers';
import type { Network } from 'x402/types';
import type { CreditTrade, TransactionEvent } from './types.js';

/**
 * Trade Verifier - Verifies trades are real on-chain transactions
 */
export class TradeVerifier {
  private provider: ethers.JsonRpcProvider;
  private network: Network;
  private usdcAddress: string;

  constructor(network: Network, rpcUrl: string, usdcAddress: string) {
    this.network = network;
    this.usdcAddress = usdcAddress;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Verify a trade by checking its transaction on-chain
   */
  async verifyTrade(trade: CreditTrade): Promise<{
    isValid: boolean;
    transactionHash?: string;
    blockNumber?: number;
    confirmations?: number;
    from?: string;
    to?: string;
    amount?: string;
    error?: string;
    explorerUrl?: string;
  }> {
    if (!trade.transactionHash) {
      return {
        isValid: false,
        error: 'No transaction hash in trade record',
      };
    }

    try {
      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(trade.transactionHash);

      if (!receipt) {
        return {
          isValid: false,
          transactionHash: trade.transactionHash,
          error: 'Transaction not found on-chain',
        };
      }

      // Check if transaction was successful
      if (receipt.status !== 1) {
        return {
          isValid: false,
          transactionHash: trade.transactionHash,
          blockNumber: receipt.blockNumber,
          confirmations: await receipt.confirmations(),
          error: 'Transaction reverted or failed',
        };
      }

      // Get transaction details
      const tx = await this.provider.getTransaction(trade.transactionHash);
      if (!tx) {
        return {
          isValid: false,
          transactionHash: trade.transactionHash,
          error: 'Transaction details not found',
        };
      }

      // Parse logs to find Transfer event
      const usdcAbi = [
        'event Transfer(address indexed from, address indexed to, uint256 value)',
      ];
      const usdcInterface = new ethers.Interface(usdcAbi);

      let transferLog = null;
      for (const log of receipt.logs) {
        try {
          const parsed = usdcInterface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed && parsed.name === 'Transfer') {
            transferLog = parsed;
            break;
          }
        } catch {
          // Not a Transfer event, continue
        }
      }

      if (!transferLog) {
        return {
          isValid: false,
          transactionHash: trade.transactionHash,
          blockNumber: receipt.blockNumber,
          error: 'No USDC Transfer event found in transaction',
        };
      }

      // Verify transfer details match trade
      const from = transferLog.args[0];
      const to = transferLog.args[1];
      const value = transferLog.args[2];

      const expectedAmount = ethers.parseUnits(trade.usdcAmount, 6); // USDC has 6 decimals

      const isValid =
        from.toLowerCase() === trade.buyerId.toLowerCase() &&
        to.toLowerCase() === trade.sellerId.toLowerCase() &&
        value >= expectedAmount;

      const explorerUrl = this.getExplorerUrl(trade.transactionHash);

      return {
        isValid,
        transactionHash: trade.transactionHash,
        blockNumber: receipt.blockNumber,
        confirmations: await receipt.confirmations(),
        from: from,
        to: to,
        amount: ethers.formatUnits(value, 6),
        error: isValid ? undefined : 'Transfer details do not match trade record',
        explorerUrl,
      };
    } catch (error) {
      return {
        isValid: false,
        transactionHash: trade.transactionHash,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify multiple trades
   */
  async verifyTrades(trades: CreditTrade[]): Promise<Array<{
    tradeId: string;
    verification: Awaited<ReturnType<TradeVerifier['verifyTrade']>>;
  }>> {
    const results = await Promise.all(
      trades.map(async (trade) => ({
        tradeId: trade.id,
        verification: await this.verifyTrade(trade),
      }))
    );

    return results;
  }

  /**
   * Get transaction details from blockchain
   */
  async getTransactionDetails(transactionHash: string): Promise<{
    hash: string;
    blockNumber: number;
    blockHash: string;
    from: string;
    to: string;
    value: bigint;
    gasUsed: bigint;
    gasPrice: bigint;
    status: number;
    confirmations: number;
    timestamp?: number;
  } | null> {
    try {
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      if (!receipt) {
        return null;
      }

      const tx = await this.provider.getTransaction(transactionHash);
      if (!tx) {
        return null;
      }

      const block = await this.provider.getBlock(receipt.blockNumber);

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        from: receipt.from,
        to: receipt.to || '',
        value: tx.value,
        gasUsed: receipt.gasUsed,
        gasPrice: tx.gasPrice || 0n,
        status: receipt.status || 0,
        confirmations: await receipt.confirmations(),
        timestamp: block?.timestamp,
      };
    } catch (error) {
      console.error('Error getting transaction details:', error);
      return null;
    }
  }

  /**
   * Check if transaction is confirmed (has enough confirmations)
   */
  async isTransactionConfirmed(
    transactionHash: string,
    requiredConfirmations: number = 1
  ): Promise<boolean> {
    try {
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      if (!receipt) {
        return false;
      }

      const confirmations = await receipt.confirmations();
      return confirmations >= requiredConfirmations;
    } catch {
      return false;
    }
  }

  /**
   * Get explorer URL for transaction
   */
  private getExplorerUrl(transactionHash: string): string {
    const explorerUrls: Record<string, string> = {
      'arbitrum-sepolia': `https://sepolia.arbiscan.io/tx/${transactionHash}`,
      arbitrum: `https://arbiscan.io/tx/${transactionHash}`,
      'base-sepolia': `https://sepolia.basescan.org/tx/${transactionHash}`,
      base: `https://basescan.org/tx/${transactionHash}`,
    };

    return explorerUrls[this.network] || `#${transactionHash}`;
  }
}


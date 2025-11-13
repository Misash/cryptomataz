import { ethers } from 'ethers';
import type { Network } from 'x402/types';

/**
 * Base class for all agents in the AutoPost network
 * Provides wallet management and common functionality
 */
export abstract class AgentBase {
  protected wallet: ethers.Wallet;
  protected provider: ethers.JsonRpcProvider;
  protected network: Network;
  protected walletAddress: string;
  protected name: string;

  constructor(
    name: string,
    privateKey: string,
    network: Network,
    rpcUrl?: string
  ) {
    this.name = name;
    this.network = network;

    // Initialize provider
    if (rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
    } else {
      // Use default RPC for network
      const rpcUrls: Record<string, string> = {
        'base-sepolia': 'https://sepolia.base.org',
        'base': 'https://mainnet.base.org',
        'polygon-amoy': 'https://rpc-amoy.polygon.technology',
        'polygon': 'https://polygon-rpc.com',
        'arbitrum-sepolia': 'https://sepolia-rollup.arbitrum.io/rpc',
        'arbitrum': 'https://arb1.arbitrum.io/rpc',
      };
      this.provider = new ethers.JsonRpcProvider(
        rpcUrls[network] || 'https://sepolia-rollup.arbitrum.io/rpc'
      );
    }

    // Initialize wallet
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.walletAddress = this.wallet.address;

    console.log(`🤖 ${this.name} initialized`);
    console.log(`   Wallet: ${this.walletAddress}`);
    console.log(`   Network: ${network}`);
  }

  /**
   * Get the agent's wallet address
   */
  getAddress(): string {
    return this.walletAddress;
  }

  /**
   * Get the agent's wallet balance (ETH)
   */
  async getEthBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.walletAddress);
    return ethers.formatEther(balance);
  }

  /**
   * Get the agent's USDC balance
   */
  async getUsdcBalance(usdcAddress: string): Promise<string> {
    const usdcAbi = [
      'function balanceOf(address account) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];
    const usdcContract = new ethers.Contract(
      usdcAddress,
      usdcAbi,
      this.provider
    );
    const balance = await usdcContract.balanceOf(this.walletAddress);
    const decimals = await usdcContract.decimals();
    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Log agent status
   */
  protected log(message: string, ...args: any[]): void {
    console.log(`[${this.name}] ${message}`, ...args);
  }

  /**
   * Log error
   */
  protected error(message: string, ...args: any[]): void {
    console.error(`[${this.name}] ❌ ${message}`, ...args);
  }
}



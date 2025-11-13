/**
 * Types and interfaces for the AutoPost agent network
 */

export interface CreditBalance {
  agentId: string;
  openaiCredits: number;
  usdcBalance: string;
  ethBalance: string;
  lastUpdated: Date;
}

export interface CreditTrade {
  id: string;
  buyerId: string;
  sellerId: string;
  creditsAmount: number;
  usdcAmount: string;
  supervisorFee: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  transactionHash?: string;
  temporaryKeyId?: string;
}

export interface TemporaryOpenAIKey {
  id: string;
  key: string;
  creditsLimit: number;
  expiresAt: Date;
  tradeId: string;
  revoked: boolean;
}

export interface AgentStatus {
  agentId: string;
  name: string;
  walletAddress: string;
  openaiCredits: number;
  usdcBalance: string;
  ethBalance: string;
  status: 'active' | 'inactive' | 'error';
  lastActivity: Date;
}

export interface TradeApproval {
  tradeId: string;
  approved: boolean;
  reason?: string;
  supervisorId: string;
  timestamp: Date;
}

export interface ContentTask {
  id: string;
  topic: string;
  researchOutput?: string;
  curatedContent?: string;
  tweetId?: string;
  engagement?: {
    likes: number;
    retweets: number;
    replies: number;
  };
  status: 'research' | 'curating' | 'posting' | 'completed' | 'failed';
  createdAt: Date;
}

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


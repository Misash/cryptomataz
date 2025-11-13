import dotenv from 'dotenv';
import { ResearcherAgent } from './ResearcherAgent.js';
import type { Network } from 'x402/types';

dotenv.config();

/**
 * Test script for the AutoPost agent network
 * Tests agent health, registration, and credit purchase flow
 */
async function testAgents() {
  console.log('🧪 Testing AutoPost Agent Network\n');
  console.log('===================================\n');

  const network = (process.env.NETWORK || 'arbitrum-sepolia') as Network;
  const supervisorUrl = 'http://localhost:3002';
  const curatorUrl = 'http://localhost:3001';

  // Test 1: Check Supervisor Health
  console.log('📋 TEST 1: Supervisor Health Check');
  console.log('=====================================');
  try {
    const response = await fetch(`${supervisorUrl}/health`);
    if (response.ok) {
      const data = await response.json() as any;
      console.log('✅ Supervisor is healthy');
      console.log(`   Agent: ${data.agent}`);
      console.log(`   Wallet: ${data.wallet}`);
      console.log(`   Network: ${data.network}`);
      console.log(`   Active Agents: ${data.activeAgents}`);
      console.log(`   Total Trades: ${data.totalTrades}\n`);
    } else {
      console.log('❌ Supervisor is not responding');
      console.log(`   Status: ${response.status}`);
      console.log('   Make sure Supervisor is running: npm run agents:start\n');
      return;
    }
  } catch (error: any) {
    console.log('❌ Cannot connect to Supervisor');
    console.log(`   Error: ${error.message}`);
    console.log('   Make sure Supervisor is running: npm run agents:start\n');
    return;
  }

  // Test 2: Check Curator Health
  console.log('📋 TEST 2: Curator Health Check');
  console.log('=====================================');
  try {
    const response = await fetch(`${curatorUrl}/health`);
    if (response.ok) {
      const data = await response.json() as any;
      console.log('✅ Curator is healthy');
      console.log(`   Agent: ${data.agent}`);
      console.log(`   Wallet: ${data.wallet}`);
      console.log(`   Network: ${data.network}`);
      console.log(`   Price: ${data.price}\n`);
    } else {
      console.log('❌ Curator is not responding');
      console.log(`   Status: ${response.status}\n`);
    }
  } catch (error: any) {
    console.log('❌ Cannot connect to Curator');
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 3: List Registered Agents
  console.log('📋 TEST 3: List Registered Agents');
  console.log('=====================================');
  try {
    const response = await fetch(`${supervisorUrl}/agents`);
    if (response.ok) {
      const agents = await response.json() as any[];
      console.log(`✅ Found ${agents.length} registered agents:\n`);
      agents.forEach((agent: any) => {
        console.log(`   - ${agent.name} (${agent.agentId})`);
        console.log(`     Status: ${agent.status}`);
        console.log(`     Credits: ${agent.openaiCredits}`);
        console.log(`     USDC: ${agent.usdcBalance}`);
        console.log(`     Last Activity: ${new Date(agent.lastActivity).toLocaleString()}\n`);
      });
    } else {
      console.log('❌ Cannot fetch agents');
      console.log(`   Status: ${response.status}\n`);
    }
  } catch (error: any) {
    console.log('❌ Error fetching agents');
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 4: Test Credit Purchase Flow (if Researcher private key is configured)
  const researcherPrivateKey = process.env.RESEARCHER_PRIVATE_KEY;
  if (researcherPrivateKey) {
    console.log('📋 TEST 4: Credit Purchase Flow');
    console.log('=====================================');
    console.log('⚠️  This test requires:');
    console.log('   - Researcher wallet funded with USDC');
    console.log('   - Researcher wallet funded with ETH for gas');
    console.log('   - USDC approval set for transfers\n');

    try {
      const researcher = new ResearcherAgent(
        researcherPrivateKey,
        network,
        curatorUrl
      );

      // Set low credit balance to trigger purchase
      researcher.setCreditBalance(3);
      console.log('📊 Researcher credit balance set to 3 (below threshold)');

      // Attempt to purchase credits
      console.log('💰 Attempting to purchase 10 credits from Curator...\n');
      const tempKey = await researcher.purchaseCredits(10);

      if (tempKey) {
        console.log('\n✅ Credit purchase successful!');
        console.log(`   Key ID: ${tempKey.id}`);
        console.log(`   Credits: ${tempKey.creditsLimit}`);
        // Handle expiresAt as Date or string (from JSON)
        const expiresAt = tempKey.expiresAt instanceof Date 
          ? tempKey.expiresAt 
          : new Date(tempKey.expiresAt);
        console.log(`   Expires: ${expiresAt.toISOString()}`);
        console.log(`   New balance: ${researcher.getCreditBalance()} credits\n`);
      } else {
        console.log('\n❌ Credit purchase failed');
        console.log('   Check wallet balances and USDC approval\n');
      }
    } catch (error: any) {
      console.log('❌ Error during credit purchase test');
      console.log(`   Error: ${error.message}\n`);
      console.log('   Common issues:');
      console.log('   - Wallet not funded with USDC');
      console.log('   - Wallet not funded with ETH for gas');
      console.log('   - USDC approval not set');
      console.log('   - Network mismatch\n');
    }
  } else {
    console.log('📋 TEST 5: Credit Purchase Flow');
    console.log('=====================================');
    console.log('⏭️  Skipped (RESEARCHER_PRIVATE_KEY not set)');
    console.log('   To test credit purchase, set RESEARCHER_PRIVATE_KEY in .env.agents\n');
  }

  // Test 5: List Trades
  console.log('📋 TEST 5: List Trades');
  console.log('=====================================');
  try {
    const response = await fetch(`${supervisorUrl}/trades`);
    if (response.ok) {
      const trades = await response.json() as any[];
      if (trades.length > 0) {
        console.log(`✅ Found ${trades.length} trades:\n`);
        trades.forEach((trade: any) => {
          console.log(`   - Trade ${trade.id}`);
          console.log(`     Buyer: ${trade.buyerId}`);
          console.log(`     Seller: ${trade.sellerId}`);
          console.log(`     Credits: ${trade.creditsAmount}`);
          console.log(`     Amount: ${trade.usdcAmount} USDC`);
          console.log(`     Status: ${trade.status}`);
          console.log(`     Created: ${new Date(trade.createdAt).toLocaleString()}\n`);
        });
      } else {
        console.log('ℹ️  No trades yet\n');
      }
    } else {
      console.log('❌ Cannot fetch trades');
      console.log(`   Status: ${response.status}\n`);
    }
  } catch (error: any) {
    console.log('❌ Error fetching trades');
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 6: Test Curator Trades
  console.log('📋 TEST 6: Curator Trades');
  console.log('=====================================');
  try {
    const response = await fetch(`${curatorUrl}/trades`);
    if (response.ok) {
      const trades = await response.json() as any[];
      if (trades.length > 0) {
        console.log(`✅ Curator has ${trades.length} trades:\n`);
        trades.slice(0, 3).forEach((trade: any) => {
          console.log(`   - ${trade.id}: ${trade.status} (${trade.creditsAmount} credits)`);
        });
        if (trades.length > 3) {
          console.log(`   ... and ${trades.length - 3} more\n`);
        } else {
          console.log('');
        }
      } else {
        console.log('ℹ️  No trades yet\n');
      }
    } else {
      console.log('❌ Cannot fetch Curator trades\n');
    }
  } catch (error: any) {
    console.log('❌ Error fetching Curator trades\n');
  }

  console.log('✅ Testing complete!\n');
  console.log('💡 Next steps:');
  console.log('   - Check agent logs for detailed information');
  console.log('   - Monitor Supervisor dashboard at http://localhost:3002');
  console.log('   - View trades at http://localhost:3002/trades\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAgents().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { testAgents };


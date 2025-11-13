import dotenv from 'dotenv';
import { CuratorAgent } from './CuratorAgent.js';
import { ResearcherAgent } from './ResearcherAgent.js';
import { SupervisorAgent } from './SupervisorAgent.js';
import type { Network } from 'x402/types';

dotenv.config();

/**
 * Start all agents in the AutoPost network
 * This is the main orchestrator for the MVP
 */
async function startAgents() {
  console.log('🚀 Starting AutoPost Agent Network...\n');

  const network = (process.env.NETWORK || 'arbitrum-sepolia') as Network;
  const rpcUrl = process.env.RPC_URL;
  const facilitatorUrl = process.env.FACILITATOR_URL;

  // Supervisor Agent (must start first)
  const supervisorPrivateKey = process.env.SUPERVISOR_PRIVATE_KEY;
  if (!supervisorPrivateKey) {
    console.error('❌ SUPERVISOR_PRIVATE_KEY is required');
    process.exit(1);
  }

  const supervisor = new SupervisorAgent(
    supervisorPrivateKey,
    network,
    3002,
    rpcUrl
  );
  await supervisor.start();
  const supervisorUrl = `http://localhost:3002`;

  // Register Supervisor with itself
  await fetch(`${supervisorUrl}/agents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: supervisor.getAddress(),
      name: 'Supervisor',
      walletAddress: supervisor.getAddress(),
    }),
  });

  // Curator Agent (credit seller)
  const curatorPrivateKey = process.env.CURATOR_PRIVATE_KEY;
  if (!curatorPrivateKey) {
    console.error('❌ CURATOR_PRIVATE_KEY is required');
    process.exit(1);
  }

  const curator = new CuratorAgent(
    curatorPrivateKey,
    network,
    3001,
    rpcUrl,
    facilitatorUrl
  );
  await curator.start();
  const curatorUrl = `http://localhost:3001`;

  // Register Curator with Supervisor
  await fetch(`${supervisorUrl}/agents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: curator.getAddress(),
      name: 'Curator',
      walletAddress: curator.getAddress(),
    }),
  });

  // Researcher Agent (credit buyer)
  const researcherPrivateKey = process.env.RESEARCHER_PRIVATE_KEY;
  if (!researcherPrivateKey) {
    console.error('❌ RESEARCHER_PRIVATE_KEY is required');
    process.exit(1);
  }

  const researcher = new ResearcherAgent(
    researcherPrivateKey,
    network,
    curatorUrl,
    rpcUrl
  );
  
  // Register Researcher with Supervisor
  await fetch(`${supervisorUrl}/agents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: researcher.getAddress(),
      name: 'Researcher',
      walletAddress: researcher.getAddress(),
    }),
  });

  console.log('\n✅ All agents started successfully!');
  console.log('\n📋 Agent Endpoints:');
  console.log(`   Supervisor: http://localhost:3002`);
  console.log(`   Curator:    http://localhost:3001`);
  console.log(`   Researcher: (client, no server)`);
  console.log('\n💡 Researcher can now purchase credits from Curator');
  console.log('💡 Supervisor is monitoring all agents');
  console.log('\n🔄 Starting credit monitoring...\n');

  // Start credit monitoring loop for Researcher
  setInterval(async () => {
    try {
      await researcher.monitorAndPurchase();
    } catch (error) {
      console.error('Error in credit monitoring:', error);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  // Cleanup expired keys periodically
  setInterval(() => {
    curator.cleanupKeys();
  }, 60 * 60 * 1000); // Every hour

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down agents...');
    process.exit(0);
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startAgents().catch((error) => {
    console.error('❌ Failed to start agents:', error);
    process.exit(1);
  });
}

export { startAgents };



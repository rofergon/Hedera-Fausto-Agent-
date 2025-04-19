import { initializeHCS10Client } from '@hashgraphonline/standards-agent-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Main test function
async function testInitialize() {
  console.log('🧪 Testing initializeHCS10Client function...');
  
  // Get environment credentials
  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  
  if (!operatorId || !operatorKey) {
    console.error('❌ Error: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY credentials are required in the .env file');
    process.exit(1);
  }
  
  console.log(`📡 Network: ${network}`);
  console.log(`🔑 Account: ${operatorId}`);
  
  try {
    console.log('🔄 Initializing client with all tools...');
    
    // Initialize with all options
    const initResult = await initializeHCS10Client({
      clientConfig: {
        operatorId: operatorId,
        operatorKey: operatorKey,
        network: network,
        logLevel: 'info'
      },
      createAllTools: true
    });
    
    // Check what we got back
    console.log('✅ Client initialized successfully');
    
    const { hcs10Client, tools } = initResult;
    
    console.log('🔍 Checking available tools:');
    
    // Print out all available tools
    const toolEntries = Object.entries(tools);
    console.log(`📋 Found ${toolEntries.length} tool(s):`);
    
    toolEntries.forEach(([name, tool]) => {
      if (tool) {
        console.log(`  ✅ ${name}: ${tool.description ? tool.description.substring(0, 50) + '...' : 'No description'}`);
      } else {
        console.log(`  ❌ ${name}: Not available`);
      }
    });
    
    // Test if the essential registerAgentTool is available
    if (tools.registerAgentTool) {
      console.log('✅ RegisterAgentTool is available');
    } else {
      console.log('❌ RegisterAgentTool is NOT available');
    }
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
}

// Run the test
testInitialize().catch(error => {
  console.error('❌ General error in tests:', error);
}); 
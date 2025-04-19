import {
  HCS10Client,
  RegisterAgentTool,
} from '@hashgraphonline/standards-agent-kit';
import * as dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { ConversationTokenBufferMemory } from 'langchain/memory';

dotenv.config();

async function main() {
  // 1. Initialize the HCS Client
  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  
  console.log('Initializing HCS client with:');
  console.log(`- Network: ${network}`);
  console.log(`- Account ID: ${operatorId}`);
  
  // Initialize the HCS10Client
  const hcsClient = new HCS10Client(operatorId, operatorKey, network);

  // 2. Create the tools
  const tools = [
    new RegisterAgentTool(hcsClient),
    // Add other tools as needed
  ];

  // 3. Set up the LangChain agent
  const llm = new ChatOpenAI({ 
    modelName: 'gpt-3.5-turbo', // You can change to 'gpt-4o' if available
    temperature: 0
  });
  
  const memory = new ConversationTokenBufferMemory({
    llm: llm,
    memoryKey: 'chat_history',
    returnMessages: true,
    outputKey: 'output' // Specify the output key explicitly
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      'You are an agent assistant based on Hedera Hashgraph. Use the register_agent tool when asked to register a new agent.',
    ],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  const agent = await createOpenAIToolsAgent({ llm, tools, prompt });
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    memory,
    verbose: true,
  });

  // 4. Run the agent
  try {
    const name = process.argv[2] || 'FaustoAgent';
    console.log(`Registering agent as '${name}'...`);
    
    const result = await agentExecutor.invoke({
      input: `Please register me as '${name}'`,
    });
    
    console.log('\nAgent Output:');
    console.log(result.output);
    
    // Extract credentials information if available
    if (result.output && result.output.includes('accountId') && result.output.includes('privateKey')) {
      console.log('\nIMPORTANT: Save these credentials for future use:');
      
      // Try to extract the JSON credentials from the output
      try {
        const credentialsMatch = result.output.match(/({[\s\S]*"accountId"[\s\S]*"privateKey"[\s\S]*})/);
        if (credentialsMatch && credentialsMatch[1]) {
          const credentials = JSON.parse(credentialsMatch[1]);
          console.log('Account ID:', credentials.accountId);
          console.log('Private Key:', credentials.privateKey);
          
          // Save the credentials to a file for easy access
          const fs = await import('fs');
          fs.writeFileSync(
            `${name}-credentials.json`, 
            JSON.stringify(credentials, null, 2)
          );
          console.log(`Credentials saved to ${name}-credentials.json`);
        }
      } catch (parseError) {
        console.log('Could not extract credentials as JSON. Please check the output above.');
      }
    }
  } catch (error) {
    console.error('Agent invocation failed:', error);
  }
}

main().catch(console.error); 
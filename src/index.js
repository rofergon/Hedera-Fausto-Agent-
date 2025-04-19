import {
  HCS10Client,
  initializeHCS10Client,
  OpenConvaiState,
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
  console.log('Initializing Hedera agent with HCS-10 OpenConvAI Standard...');
  
  // 1. Initialize the HCS Client and get all tools using the enhanced function
  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  
  console.log(`- Network: ${network}`);
  console.log(`- Account ID: ${operatorId}`);
  
  // Initialize with state management for connections
  const initResult = await initializeHCS10Client({
    clientConfig: {
      operatorId: operatorId,
      operatorKey: operatorKey,
      network: network,
      logLevel: 'info'
    },
    stateManager: new OpenConvaiState(), // Manages connection state
    createAllTools: true,                // Create all available tools
    monitoringClient: true               // Enable automatic monitoring
  });
  
  // Extract the HCS10Client instance and tools
  const { hcs10Client, tools } = initResult;
  
  // Create a wrapper for the FindRegistrationsTool to ensure proper parameter usage
  if (tools.findRegistrationsTool) {
    const originalInvoke = tools.findRegistrationsTool.invoke;
    tools.findRegistrationsTool.invoke = async (params) => {
      console.log('Original search params:', params);
      
      // If trying to search with tags or type but no nameQuery, convert to nameQuery
      const newParams = { ...params };
      
      if (params.tags && !params.nameQuery) {
        // Convert tags to nameQuery if that's what they're trying to use
        newParams.nameQuery = Array.isArray(params.tags) ? params.tags[0] : params.tags;
        delete newParams.tags;
      }
      
      if (params.accountId && !params.nameQuery && typeof params.accountId === 'string' && !params.accountId.includes('.')) {
        // If using accountId as a search term incorrectly, convert to nameQuery
        newParams.nameQuery = params.accountId;
        delete newParams.accountId;
      }
      
      console.log('Modified search params:', newParams);
      return originalInvoke.call(tools.findRegistrationsTool, newParams);
    };
  }
  
  // 2. Extract all available tools and filter out undefined ones
  const availableTools = Object.values(tools).filter(Boolean);
  
  console.log(`Available tools: ${availableTools.length}`);
  availableTools.forEach(tool => {
    console.log(`- ${tool.name}: ${tool.description.substring(0, 50)}...`);
  });

  // 3. Set up the LangChain agent with a comprehensive prompt
  const llm = new ChatOpenAI({ 
    modelName: 'o3-mini', // You can change to 'gpt-4o' if available
              
  });
  
  const memory = new ConversationTokenBufferMemory({
    llm: llm,
    memoryKey: 'chat_history',
    returnMessages: true,
    outputKey: 'output' // Specify the output key explicitly
  });

  // Create a comprehensive prompt that guides the agent on using all tools
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are an autonomous agent assistant on the Hedera Hashgraph network.
      
      You can perform the following actions:
      - Register yourself as a new agent (use register_agent)
      - Search for other agents by name or category (use find_registrations)
      - Initiate connections with other agents (use initiate_connection)
      - List your existing connections (use list_connections)
      - Send messages to connected agents (use send_message_to_connection)
      - Check for received messages (use check_messages)
      
      When a user asks you to interact with another agent, you should:
      1. Search for the agent by name or category
      2. Initiate a connection if one doesn't exist
      3. Send the requested message
      4. Check for replies
      
      IMPORTANT INSTRUCTIONS FOR SEARCHING:
      When searching for agents with find_registrations, you MUST use the nameQuery parameter for the search terms.
      
      CORRECT FORMAT: find_registrations with nameQuery: "finance"
      
      DO NOT use tags, type, or accountId parameters for name searches.
      NEVER use tags: ["finance"] or similar formats - this will cause errors.
      
      Be proactive in completing complex requests. Break down tasks into logical steps.
      When registering, select appropriate capabilities that match your purpose.`
    ],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  const agent = await createOpenAIToolsAgent({ llm, tools: availableTools, prompt });
  const agentExecutor = new AgentExecutor({
    agent,
    tools: availableTools,
    memory,
    verbose: true,
  });

  // 4. Start the connection monitor to handle incoming requests
  const monitorTool = tools.connectionMonitorTool;
  if (monitorTool) {
    console.log('Starting connection monitor...');
    // Monitor for 5 minutes (300 seconds)
    monitorTool.invoke({
      monitorDurationSeconds: 300,
      acceptAll: false // Don't automatically accept all connections
    }).catch(error => {
      console.error('Connection monitor error:', error);
    });
  }

  // 5. Display menu and handle user choices
  const readline = await import('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  let credentials = null;
  let registered = false;
  
  // Define a function to display the menu
  function displayMenu() {
    console.log('\n==== Hedera Agent Menu ====');
    console.log('1. Chat with Agent');
    console.log('2. Register New Agent');
    console.log('3. Find Agents');
    console.log('4. Connect with Agent');
    console.log('5. Send Message to Agent');
    console.log('6. Check Received Messages');
    
    // Additional options if an agent is registered
    if (registered) {
      console.log('7. View My Agent Profile');
      console.log('8. List My Connections');
    }
    
    console.log('0. Exit');
    console.log('========================');
    rl.question('Select an option: ', handleMenuChoice);
  }

  // Function to handle the user's menu choice
  async function handleMenuChoice(choice) {
    switch (choice) {
      case '1': // Chat with Agent
        console.log('\n==== Agent Chat Mode ====');
        console.log('Type your messages to chat with the agent. Type "menu" to return to the main menu.\n');
        startChatMode();
        break;
        
      case '2': // Register New Agent
        rl.question('Enter agent name (default: FaustoAgent): ', async (name) => {
          name = name.trim() || 'FaustoAgent';
          console.log(`Registering agent as '${name}'...`);
          
          try {
            const result = await agentExecutor.invoke({
              input: `Register me as '${name}' with capabilities for messaging and information retrieval`,
            });
            
            console.log('\nAgent Output:');
            console.log(result.output);
            
            // Extract credentials if available
            if (result.output && result.output.includes('accountId') && result.output.includes('privateKey')) {
              try {
                const credentialsMatch = result.output.match(/({[\s\S]*"accountId"[\s\S]*"privateKey"[\s\S]*})/);
                if (credentialsMatch && credentialsMatch[1]) {
                  credentials = JSON.parse(credentialsMatch[1]);
                  registered = true;
                  console.log('\nIMPORTANT: Agent credentials found and saved.');
                  
                  // Save to file
                  const fs = await import('fs');
                  const filename = `${name}-credentials.json`;
                  fs.writeFileSync(
                    filename, 
                    JSON.stringify(credentials, null, 2)
                  );
                  console.log(`Credentials saved to ${filename}`);
                  
                  // Update the agent's identity
                  console.log('Updating agent identity with new credentials...');
                  hcs10Client.setClient(credentials.accountId, credentials.privateKey);
                }
              } catch (parseError) {
                console.log('Could not extract credentials as JSON. Please check the output above.');
              }
            }
          } catch (error) {
            console.error('Registration failed:', error);
          }
          
          displayMenu();
        });
        break;
        
      case '3': // Find Agents
        rl.question('Enter search term (e.g., "finance", "weather"): ', async (searchTerm) => {
          try {
            const result = await agentExecutor.invoke({
              input: `Find agents related to ${searchTerm}`,
            });
            
            console.log('\nAgent Output:');
            console.log(result.output);
          } catch (error) {
            console.error('Search failed:', error);
          }
          
          displayMenu();
        });
        break;
        
      case '4': // Connect with Agent
        rl.question('Enter agent ID to connect with: ', async (agentId) => {
          try {
            const result = await agentExecutor.invoke({
              input: `Connect with agent ${agentId}`,
            });
            
            console.log('\nAgent Output:');
            console.log(result.output);
          } catch (error) {
            console.error('Connection failed:', error);
          }
          
          displayMenu();
        });
        break;
        
      case '5': // Send Message
        rl.question('Enter agent ID: ', (agentId) => {
          rl.question('Enter message: ', async (message) => {
            try {
              const result = await agentExecutor.invoke({
                input: `Send message "${message}" to agent ${agentId}`,
              });
              
              console.log('\nAgent Output:');
              console.log(result.output);
            } catch (error) {
              console.error('Sending message failed:', error);
            }
            
            displayMenu();
          });
        });
        break;
        
      case '6': // Check Messages
        try {
          const result = await agentExecutor.invoke({
            input: 'Check if I have any new messages',
          });
          
          console.log('\nAgent Output:');
          console.log(result.output);
        } catch (error) {
          console.error('Checking messages failed:', error);
        }
        
        displayMenu();
        break;
        
      case '7': // View Agent Profile
        if (registered) {
          try {
            const result = await agentExecutor.invoke({
              input: 'Show me my profile information',
            });
            
            console.log('\nAgent Output:');
            console.log(result.output);
          } catch (error) {
            console.error('Getting profile failed:', error);
          }
        } else {
          console.log('You need to register an agent first (option 2).');
        }
        
        displayMenu();
        break;
        
      case '8': // List Connections
        if (registered) {
          try {
            const result = await agentExecutor.invoke({
              input: 'List all my connections',
            });
            
            console.log('\nAgent Output:');
            console.log(result.output);
          } catch (error) {
            console.error('Listing connections failed:', error);
          }
        } else {
          console.log('You need to register an agent first (option 2).');
        }
        
        displayMenu();
        break;
        
      case '0': // Exit
        console.log('Exiting...');
        rl.close();
        process.exit(0);
        break;
        
      default:
        console.log('Invalid option. Please try again.');
        displayMenu();
        break;
    }
  }

  // Function to handle chat mode
  function startChatMode() {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'menu') {
        displayMenu();
        return;
      }
      
      try {
        const result = await agentExecutor.invoke({ input });
        
        console.log('\nAgent:', result.output);
        startChatMode(); // Continue chat mode
      } catch (error) {
        console.error('Error in chat:', error);
        startChatMode();
      }
    });
  }

  // Start with the menu
  console.log('\nAgent initialized and ready!');
  displayMenu();
}

main().catch(console.error); 
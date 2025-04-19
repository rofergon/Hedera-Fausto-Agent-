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
import logger from './utils/logger.js';
import { applyConsolePatch } from './utils/console-patch.js';

dotenv.config();

// Apply console patch to intercept and format logs from libraries
applyConsolePatch();

// Default log level from environment or set to INFO
const logLevel = process.env.LOG_LEVEL || 'INFO';
logger.configure({ level: logLevel });

async function main() {
  logger.info('Initializing Hedera agent with HCS-10 OpenConvAI Standard...', 'Main');
  
  // 1. Initialize the HCS Client and get all tools using the enhanced function
  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  
  logger.info(`- Network: ${network}`, 'Config');
  logger.info(`- Account ID: ${operatorId}`, 'Config');
  
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
      logger.debug('Original search params:', 'FindTool');
      logger.debug(JSON.stringify(params), 'FindTool');
      
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
      
      logger.debug('Modified search params:', 'FindTool');
      logger.debug(JSON.stringify(newParams), 'FindTool');
      
      const results = await originalInvoke.call(tools.findRegistrationsTool, newParams);
      
      // Use the specialized search results logger
      if (newParams.nameQuery) {
        logger.searchResults(results, newParams.nameQuery);
      }
      
      return results;
    };
  }
  
  // 2. Extract all available tools and filter out undefined ones
  const availableTools = Object.values(tools).filter(Boolean);
  
  logger.info(`Available tools: ${availableTools.length}`, 'Tools');
  availableTools.forEach(tool => {
    logger.debug(`- ${tool.name}: ${tool.description.substring(0, 50)}...`, 'Tools');
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
  
  // Check if verbose debugging is enabled in environment (default to false)
  const verboseDebug = process.env.VERBOSE_DEBUG === 'true';
  
  const agentExecutor = new AgentExecutor({
    agent,
    tools: availableTools,
    memory,
    verbose: verboseDebug, // Only show verbose logs if explicitly enabled
  });

  // 4. Start the connection monitor to handle incoming requests
  const monitorTool = tools.connectionMonitorTool;
  if (monitorTool) {
    logger.info('Starting connection monitor...', 'Monitor');
    // Monitor for 5 minutes (300 seconds)
    monitorTool.invoke({
      monitorDurationSeconds: 300,
      acceptAll: false // Don't automatically accept all connections
    }).catch(error => {
      logger.error(`Connection monitor error: ${error}`, 'Monitor');
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
          logger.info(`Registering agent as '${name}'...`, 'Registration');
          
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
                  logger.info('\nIMPORTANT: Agent credentials found and saved.', 'Registration');
                  
                  // Save to file
                  const fs = await import('fs');
                  const filename = `${name}-credentials.json`;
                  fs.writeFileSync(
                    filename, 
                    JSON.stringify(credentials, null, 2)
                  );
                  logger.info(`Credentials saved to ${filename}`, 'Registration');
                  
                  // Update the agent's identity
                  logger.info('Updating agent identity with new credentials...', 'Registration');
                  hcs10Client.setClient(credentials.accountId, credentials.privateKey);
                }
              } catch (parseError) {
                logger.error('Could not extract credentials as JSON. Please check the output above.', 'Registration');
              }
            }
          } catch (error) {
            logger.error(`Registration failed: ${error}`, 'Registration');
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
            logger.error(`Search failed: ${error}`, 'Search');
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
            logger.error(`Connection failed: ${error}`, 'Connection');
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
              logger.error(`Sending message failed: ${error}`, 'Messaging');
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
          logger.error(`Checking messages failed: ${error}`, 'Messaging');
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
            logger.error(`Getting profile failed: ${error}`, 'Profile');
          }
        } else {
          logger.warn('You need to register an agent first (option 2).', 'Profile');
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
            logger.error(`Listing connections failed: ${error}`, 'Connection');
          }
        } else {
          logger.warn('You need to register an agent first (option 2).', 'Connection');
        }
        
        displayMenu();
        break;
        
      case '0': // Exit
        logger.info('Exiting...', 'Main');
        rl.close();
        process.exit(0);
        break;
        
      default:
        logger.warn('Invalid option. Please try again.', 'Menu');
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
        
        // Print a clean divider between user input and agent response
        console.log('\n' + '─'.repeat(50) + '\n');
        
        // Display agent response without "Agent:" prefix
        console.log(result.output);
        
        // Print divider after response
        console.log('\n' + '─'.repeat(50));
        
        startChatMode(); // Continue chat mode
      } catch (error) {
        logger.error(`Error in chat: ${error}`, 'Chat');
        startChatMode();
      }
    });
  }

  // Start with the menu
  logger.info('\nAgent initialized and ready!', 'Main');
  displayMenu();
}

// Run the main function
main().catch(error => {
  logger.error(`Unhandled error: ${error}`, 'Main');
}); 
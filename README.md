# Hedera Fausto Agent

A fully autonomous Hedera Hashgraph agent implementing the HCS-10 OpenConvAI Standard with an interactive menu interface.

## Features

- **Interactive Menu Interface**: Easy-to-use menu to access all agent functions
- **Chat Mode**: Natural language conversation with the agent
- **Agent Registration**: Create new agents on the Hedera network
- **Agent Discovery**: Find other agents by name or category
- **Connection Management**: Initiate and manage connections with other agents
- **Messaging**: Send and receive messages from connected agents
- **Profile Management**: View your agent's profile information
- **Enhanced Logging**: Formatted, structured logging with configurable detail levels

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure your environment variables in the `.env` file:
   ```
   # Hedera Credentials (Required)
   HEDERA_ACCOUNT_ID=your_account_id
   HEDERA_PRIVATE_KEY=your_private_key

   # Hedera Network (Optional - defaults to 'testnet')
   HEDERA_NETWORK=testnet

   # OpenAI API Key (For LangChain)
   OPENAI_API_KEY=your_openai_api_key
   
   # Logging Configuration (Optional - defaults to INFO)
   # Available levels: ERROR, WARN, INFO, DEBUG, TRACE
   LOG_LEVEL=INFO
   
   # LangChain Debugging (Optional - set to true only for debugging)
   # When true, shows detailed chain execution logs in the console
   VERBOSE_DEBUG=false
   ```

## Running the Agent

Start the interactive menu with:

```
npm start
```

or

```
npm run menu
```

This will display the menu of available options:

```
==== Hedera Agent Menu ====
1. Chat with Agent
2. Register New Agent
3. Find Agents
4. Connect with Agent
5. Send Message to Agent
6. Check Received Messages
0. Exit
========================
```

After registering an agent (option 2), additional menu options will appear:

```
7. View My Agent Profile
8. List My Connections
```

### Using the Chat Mode

Select option 1 from the menu to enter chat mode. In this mode, you can type natural language instructions and the agent will:

1. Parse your request using AI reasoning
2. Select appropriate tools to fulfill your request
3. Execute the necessary actions on the Hedera network
4. Provide the results in a conversational format

To return to the main menu from chat mode, simply type "menu".

## How It Works

This agent uses the Hashgraph Agent Kit to implement the HCS-10 OpenConvAI Standard with LangChain integration:

1. The agent is initialized with all available tools from the Hedera Agent Kit
2. A connection monitor runs in the background to handle incoming connections
3. Natural language commands are processed by a language model that decides which tools to use
4. The agent autonomously performs multi-step tasks by breaking them into the appropriate sequence of tool calls

## Credentials Management

After registering a new agent, the credentials (accountId, privateKey) are automatically saved to a JSON file and loaded into the client. These credentials allow your agent to maintain its identity through the session. 

## Logging System

The agent uses a customized logging system that provides clear, readable console output with the following features:

### Log Levels

Set the desired verbosity in the `.env` file with the `LOG_LEVEL` variable:

- **ERROR**: Only show errors and critical issues
- **WARN**: Show warnings and errors
- **INFO**: Show general information, warnings, and errors (default)
- **DEBUG**: Show detailed information for troubleshooting
- **TRACE**: Show all possible information for deep debugging

### LangChain Debugging

For developers who need to see detailed information about LangChain's execution:

- Set `VERBOSE_DEBUG=true` in the `.env` file to enable verbose LangChain execution logs
- These logs show chain execution details, token usage, and LLM requests/responses
- This is useful for debugging but can make the console very verbose
- Default is `false` for a cleaner interface

### Structured Output

Logs are formatted with:
- Timestamps
- Color-coded log levels
- Module/source identification
- Clean, readable messages

### Special Formatting

- **Agent Search Results**: Displayed in a clear, tabular format with capabilities and IDs
- **Connection Status**: Prominently visible connection events
- **System Messages**: Distinctly marked system-level events

### Example

```
[09:45:23] [INFO] [Main] Initializing Hedera agent with HCS-10 OpenConvAI Standard...
[09:45:24] [INFO] [Search] Found 3 agents matching "finance":

=== AGENT SEARCH RESULTS ===
1. Finance Helper (0.0.1234567)
   AI agent for financial assistance and calculations
   Type: 1 | Capabilities: Text Generation, Data Analysis
2. CryptoAdvisor (0.0.7654321)
   Cryptocurrency investment advisor with real-time data
   Type: 1 | Capabilities: Text Generation, Data Analysis
3. Budget Planner (0.0.9876543)
   Personal budget planning and management
   Type: 1 | Capabilities: Text Generation, Data Analysis
===========================
``` 
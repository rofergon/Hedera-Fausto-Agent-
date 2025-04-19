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
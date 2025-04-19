# Hedera Fausto Agent

A basic Hedera Hashgraph agent implementing the HCS-10 OpenConvAI Standard.

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

To run the agent with the default name "FaustoAgent":

```
npm start
```

To run the agent with a custom name:

```
npm start -- "CustomAgentName"
```

## How It Works

This agent uses the Hashgraph Agent Kit to implement the HCS-10 OpenConvAI Standard. When you run the agent:

1. It initializes the HCS10Client with your Hedera credentials
2. Sets up LangChain integration with the RegisterAgentTool
3. Registers a new agent with the specified name on the Hedera network
4. Returns the agent's credentials for future use

## Important

After registering your agent, make sure to save the returned credentials (accountId and privateKey) for future use. These will be required to interact with your agent in subsequent sessions. 
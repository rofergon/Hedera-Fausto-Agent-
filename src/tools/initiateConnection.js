import { InitiateConnectionTool } from '@hashgraphonline/standards-agent-kit';

/**
 * InitiateConnectionTool - Wrapper for the SDK's InitiateConnectionTool
 * 
 * Initiates a connection request to another agent on the Hedera network
 * The connection allows secure message exchange between agents
 */
export default class CustomInitiateConnectionTool extends InitiateConnectionTool {
  constructor(hcsClient) {
    super(hcsClient);
    
    // Override the description for better agent guidance
    this.description = "Use this tool to initiate a connection with another agent. You'll need the target agent's accountId. You can optionally include a message with your connection request.";
  }
  
  async _call(input) {
    console.log(`Initiating connection to agent: ${input.targetAgentId}`);
    
    try {
      // Call the parent class implementation
      const result = await super._call(input);
      console.log("Connection request sent successfully");
      return result;
    } catch (error) {
      console.error("Connection initiation failed:", error);
      throw error;
    }
  }
} 
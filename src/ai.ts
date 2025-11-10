import { OpenAI } from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

type ProposalResult = "Approved" | "Rejected";

export interface VoteResult {
  vote: ProposalResult;
  reasoning: string;
}

/*
TODO: Add verification of the AI model https://docs.near.ai/cloud/verification/
*/

export async function aiVote(manifesto: string, proposal: string): Promise<VoteResult> {
  if (!process.env.NEAR_AI_API_KEY) {
    throw new Error("NEAR_AI_API_KEY environment variable is not set");
  }

  // Set up the OpenAI client
  const openai = new OpenAI({
    baseURL: 'https://cloud-api.near.ai/v1',
    apiKey: process.env.NEAR_AI_API_KEY,
  });

  // Set the system message that will be sent to the AI model
  const systemMessage = "You are a Decentralized Autonomous Organization (DAO) agent. You are responsible for making decisions on behalf of the DAO. Each prompt will contain the manifesto you use to vote and a proposal that you will vote on. You will vote on the proposal based on the manifesto. You will provide both your vote (Approved or Rejected) and a clear explanation of your reasoning based on how the proposal aligns with the manifesto. You must keep responses under 10,000 characters.";

  // Create the user message that will be sent to the AI model, a combination of the manifesto and the proposal
  const userMessage = `
  Manifesto: ${manifesto}
  Proposal: ${proposal}
  `;

  // Create the request object that will be sent to the AI model
  // Uses a tool so the vote can only be "Approved" or "Rejected"
  const request: ChatCompletionCreateParamsNonStreaming = {
    model: "deepseek-ai/DeepSeek-V3.1",
    tools: [
      {
        type: "function",
        function: {
          name: "dao_vote",
          description: "Vote on a DAO proposal with reasoning",
          parameters: {
            type: "object",
            properties: { 
              vote: { type: "string", enum: ["Approved", "Rejected"] },
              reasoning: { type: "string", description: "Explanation for the voting decision based on the manifesto" }
            },
            required: ["vote", "reasoning"]
          }
        }
      }
    ],
    tool_choice: { type: "function", function: { name: "dao_vote" } },
    messages: [
      { 
        role: "system", 
        content: systemMessage 
      },
      { role: "user", content: userMessage }
    ]
  };

  // Send the request to the AI model
  const completion = await openai.chat.completions.create(request);

  // Extract the information from the response
  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== 'function') {
    throw new Error('Expected function tool call response');
  }
  const rawResponse = JSON.parse(toolCall.function.arguments);
  
  // Validate the vote is exactly "Approved" or "Rejected"
  if (rawResponse.vote !== "Approved" && rawResponse.vote !== "Rejected") {
    throw new Error(`Invalid vote: "${rawResponse.vote}". Vote must be exactly "Approved" or "Rejected"`);
  }

  // Check that reasoning is under 10,000 characters
  if (rawResponse.reasoning.length > 10000) {
    throw new Error(`AI response too long: ${rawResponse.reasoning.length} characters. Must be under 10,000 characters.`);
  }

  console.log("System Message:", systemMessage);
  console.log("User Message:", userMessage);
  console.log("Vote:", rawResponse.vote);
  console.log("Reasoning:", rawResponse.reasoning);

  const voteResult: VoteResult = {
    vote: rawResponse.vote,
    reasoning: rawResponse.reasoning
  };
  
  return voteResult;
}

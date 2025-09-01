import { OpenAI } from 'openai';

const BASE_URL = "https://cloud-api.near.ai/v1";
const MODEL_NAME = "deepseek-chat-v3-0324";
const systemMessage = "You are a Decentralized Autonomous Organization (DAO) agent. You are responsible for making decisions on behalf of the DAO. Each prompt will contain the manifesto you use to vote and a proposal that you will vote on. You will vote on the proposal based on the manifesto. You will provide both your vote (Approved or Rejected) and a clear explanation of your reasoning based on how the proposal aligns with the manifesto.";


export async function aiVote(manifesto, proposal) {
  const API_KEY = process.env.AI_API_KEY;

  const openai = new OpenAI({
    baseURL: BASE_URL,
    apiKey: API_KEY,
  });

  const userMessage = `
  Manifesto: ${manifesto}
  Proposal: ${proposal}
  `

  const request = {
    model: MODEL_NAME,
    tools: [
      {
        type: "function",
        function: {
          name: "dao_vote",
          description: "Vote on a DAO proposal with reasoning",
          parameters: {
            type: "object",
            properties: { 
              answer: { type: "string", enum: ["Approved","Rejected"] },
              reasoning: { type: "string", description: "Explanation for the voting decision based on the manifesto" }
            },
            required: ["answer", "reasoning"]
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
  }

const completion = await openai.chat.completions.create(request);

const args = JSON.parse(completion.choices[0].message.tool_calls[0].function.arguments);

// Check that vote is exactly "Approved" or "Rejected"
if (args.answer !== "Approved" && args.answer !== "Rejected") {
  throw new Error(`Invalid vote: "${args.answer}". Vote must be exactly "Approved" or "Rejected"`);
}

console.log("System Message:", systemMessage);
console.log("User Message:", userMessage);
console.log("Vote:", args.answer);
console.log("Reasoning:", args.reasoning);

return args;

}

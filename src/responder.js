import { agentCall, agentView } from "@neardefi/shade-agent-js";
import crypto from "crypto";
import { aiVote } from "./ai.js";

export async function responder() {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const requests = await agentView({
            methodName: "get_pending_proposals",
            args: {}
        });

        if (requests.length === 0) {
            console.log("No pending proposals");
            continue;
        }

        console.log("Found pending proposals amount: ", requests.length);
        console.log(requests);

        const manifesto = await agentView({
            methodName: "get_manifesto",
            args: {}
        });

        // TODO add parallel processing

        // Respond to the first proposal
        const proposal_to_respond_to = requests[0];
        const yield_id = proposal_to_respond_to[0];
        const proposal_text = proposal_to_respond_to[1];

        // Use verifiable LLM to vote on the proposal
        const voteResponse = await aiVote(manifesto, proposal_text);
        const vote = voteResponse.answer;
        const reasoning = voteResponse.reasoning;

        // Hash the proposal and manifesto
        const proposal_hash = crypto.createHash('sha256').update(proposal_text).digest('hex');
        const manifesto_hash = crypto.createHash('sha256').update(manifesto).digest('hex');

        const response = JSON.stringify({
            manifesto_hash: manifesto_hash,
            proposal_hash: proposal_hash,
            vote: vote,
            reasoning: reasoning
        });

        try {
            await agentCall({
                methodName: "agent_vote",
                args: {
                    yield_id: yield_id,
                    response: response
                },
            });

            console.log(`Successfully voted on proposal with vote: ${vote}`);
        } catch (error) {
            console.error(`Error voting on proposal:`, error);
        }
    }
}

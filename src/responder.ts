import { agentCall, agentView } from "@neardefi/shade-agent-js";
import crypto from "crypto";
import { aiVote, VoteResult } from "./ai";

interface ProposalRequest {
    yield_id: string;
    proposal_text: string;
}

export async function responder(): Promise<void> {
    while (true) {
        try {
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Fetch the pending proposals
            const requests: [number, ProposalRequest][] = await agentView({
                methodName: "get_pending_proposals",
                args: {}
            });

            // If there are no pending proposals restart the loop
            if (requests.length === 0) {
                console.log("No pending proposals");
                continue;
            }

            console.log("Found pending proposals amount: ", requests.length);
            console.log(requests);

            // Extract the proposal text and yield id from the oldest proposal
            const proposal_to_respond_to: [number, ProposalRequest] = requests[0];
            const proposal_id: number = proposal_to_respond_to[0];
            const yield_id: string = proposal_to_respond_to[1].yield_id;
            const proposal_text: string = proposal_to_respond_to[1].proposal_text;

            // Fetch the manifesto
            const manifesto_text: string = await agentView({
                methodName: "get_manifesto",
                args: {}
            });

            // Use verifiable LLM to vote on the proposal
            const voteResult: VoteResult = await aiVote(manifesto_text, proposal_text);
            
            // Hash the proposal and manifesto
            const proposal_hash: string = crypto.createHash('sha256').update(proposal_text).digest('hex');
            const manifesto_hash: string = crypto.createHash('sha256').update(manifesto_text).digest('hex');

            // Send the response to the contract
            const response = {
                proposal_id: proposal_id,
                proposal_hash: proposal_hash,
                manifesto_hash: manifesto_hash,
                vote: voteResult.vote,
                reasoning: voteResult.reasoning
            };

            await agentCall({
                methodName: "agent_vote",
                args: {
                    yield_id: yield_id,
                    response: response
                },
            });

            console.log(`Successfully voted on proposal with id: ${proposal_id}`);
        } catch (error) {
        console.error(`Error with responder:`, error);
        }
    }
}

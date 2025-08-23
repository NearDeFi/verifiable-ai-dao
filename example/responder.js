import { Account } from "@near-js/accounts";
import { JsonRpcProvider } from "@near-js/providers";
import { KeyPairSigner } from "@near-js/signers";
import dotenv from "dotenv";
import crypto from "crypto";


dotenv.config();

const contractId = process.env.CONTRACT_ID;

const provider = new JsonRpcProvider({
    url: "https://test.rpc.fastnear.com",
  });

const privateKey = process.env.PRIVATE_KEY;
const signer = KeyPairSigner.fromSecretKey(privateKey); 

const accountId = process.env.ACCOUNT_ID;
const account = new Account(accountId, provider, signer); 

async function main() {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const requests = await provider.callFunction(
            contractId,
            "get_pending_proposals",
            {}
        );

        if (requests.length === 0) {
            console.log("No pending proposals");
            continue;
        }

        console.log("Found pending proposals amount: ", requests.length);
        console.log(requests);

        const manifesto = await provider.callFunction(
            contractId,
            "get_manifesto",
            {}
        );

        // TODO add parallel processing

        // Respond to the first proposal
        const proposal_to_respond_to = requests[0];

        const yield_id = proposal_to_respond_to[0];
        const proposal_text = proposal_to_respond_to[1];

        const proposal_hash = crypto.createHash('sha256').update(proposal_text).digest('hex');
        
        const manifesto_hash = crypto.createHash('sha256').update(manifesto).digest('hex');

        // Randomly choose between "Approved" and "Rejected"
        const vote = Math.random() < 0.5 ? "Approved" : "Rejected";
        
        const response = JSON.stringify({
            manifesto_hash: manifesto_hash,
            proposal_hash: proposal_hash,
            vote: vote
        });

        try {
            await account.callFunction({
                contractId: contractId,
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

main();

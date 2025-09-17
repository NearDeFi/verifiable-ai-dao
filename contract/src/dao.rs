use crate::*;
use serde_json::json;
use sha2::{Digest, Sha256};

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct Manifesto {
    pub manifesto_text: String,
    pub manifesto_hash: String,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct ProposalRequest {
    pub yield_id: CryptoHash,
    pub proposal_text: String,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct FinalizedProposal {
    pub proposal_text: String,
    pub proposal_result: ProposalResult,
    pub reasoning: String,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub enum ProposalResult {
    Approved,
    Rejected,
}

#[near(serializers = [json])]
pub struct AiResponse {
    proposal_id: u32,
    proposal_hash: String,
    manifesto_hash: String,
    vote: ProposalResult,
    reasoning: String,
}

#[near(serializers = [json])]
pub struct DaoResponse {
    vote: ProposalResult,
    reasoning: String,
}

const YIELD_REGISTER: u64 = 0;
const RETURN_EXTERNAL_RESPONSE_GAS: Gas = Gas::from_tgas(50);
const FAIL_ON_TIMEOUT_GAS: Gas = Gas::from_tgas(10);

#[near]
impl Contract {
    pub fn set_manifesto(&mut self, manifesto_text: String) {
        self.require_owner();

        require!(
            manifesto_text.len() <= 10000,
            "Manifesto text needs to be under 10,000 characters"
        );

        self.manifesto = Manifesto {
            manifesto_text: manifesto_text.clone(),
            manifesto_hash: hash(manifesto_text),
        };
    }

    pub fn create_proposal(&mut self, proposal_text: String) {
        require!(
            self.manifesto.manifesto_hash != String::from(""),
            "Manifesto not set"
        );
        require!(
            proposal_text.len() <= 10000,
            "Proposal text needs to be under 10,000 characters"
        );

        self.current_proposal_id += 1;
        let proposal_id = self.current_proposal_id;

        // Create a yielded promise
        let yielded_promise = env::promise_yield_create(
            "return_external_response", // Function to call when the promise is resumed
            &json!({ "proposal_id": proposal_id, "proposal_text": proposal_text })
                .to_string()
                .into_bytes(),
            RETURN_EXTERNAL_RESPONSE_GAS,
            GasWeight::default(),
            YIELD_REGISTER,
        );

        // Read the yield id from the register
        let yield_id: CryptoHash = env::read_register(YIELD_REGISTER)
            .expect("read_register failed")
            .try_into()
            .expect("conversion to CryptoHash failed");

        // Create a proposal request and insert it into the pending proposals map
        let proposal_request = ProposalRequest {
            yield_id,
            proposal_text: proposal_text.clone(),
        };

        self.pending_proposals.insert(proposal_id, proposal_request);

        // Return the yielded promise
        env::promise_return(yielded_promise)
    }

    // Function for the agent to call and resume the yield promise
    pub fn agent_vote(&mut self, yield_id: CryptoHash, response: AiResponse) {
        // Comment this out for local development
        self.require_approved_codehash();

        require!(
            response.reasoning.len() <= 10000,
            "Reasoning needs to be under 10,000 characters"
        );

        // Verify the manifesto hash matches
        // Will error if the manifesto is changed in between the proposal being created and the agent voting
        require!(
            response.manifesto_hash == self.manifesto.manifesto_hash,
            "Manifesto hash mismatch"
        );

        // Verify the proposal exists and hash matches
        let pending_proposal = self
            .pending_proposals
            .get(&response.proposal_id)
            .expect("Proposal not found or already processed");

        require!(
            response.proposal_hash == hash(pending_proposal.proposal_text.clone()),
            "Proposal hash mismatch"
        );

        // Resume the yielded promise
        env::promise_yield_resume(&yield_id, &serde_json::to_vec(&response).unwrap());
    }

    // Function called once the yielded promise is resolved
    #[private]
    pub fn return_external_response(
        &mut self,
        proposal_id: u32,
        proposal_text: String,
        #[callback_result] response: Result<AiResponse, PromiseError>,
    ) -> PromiseOrValue<DaoResponse> {
        self.pending_proposals.remove(&proposal_id);

        match response {
            Ok(ai_response) => {
                // Add to finalized proposals and return the decision
                let finalized_proposal = FinalizedProposal {
                    proposal_text,
                    proposal_result: ai_response.vote.clone(),
                    reasoning: ai_response.reasoning.clone(),
                };
                self.finalized_proposals
                    .insert(proposal_id, finalized_proposal);

                PromiseOrValue::Value(DaoResponse {
                    vote: ai_response.vote,
                    reasoning: ai_response.reasoning,
                })
            }
            Err(_) => {
                // Make a call to fail_on_timeout to cause a failed receipt
                let promise = Promise::new(env::current_account_id()).function_call(
                    "fail_on_timeout".to_string(),
                    vec![],
                    NearToken::from_near(0),
                    FAIL_ON_TIMEOUT_GAS,
                );
                PromiseOrValue::Promise(promise.as_return())
            }
        }
    }

    // Function to cause a failed receipt if the proposal request times out
    #[private]
    pub fn fail_on_timeout(&self) {
        env::panic_str("Proposal request timed out");
    }

    pub fn get_manifesto(&self) -> String {
        self.manifesto.manifesto_text.clone()
    }

    pub fn get_pending_proposals(
        &self,
        from_index: &Option<u32>,
        limit: &Option<u32>,
    ) -> Vec<(u32, ProposalRequest)> {
        let from = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(self.pending_proposals.len());

        self.pending_proposals
            .iter()
            .filter(|(id, _)| **id >= from)
            .take(limit as usize)
            .map(|(id, request)| (*id, request.clone()))
            .collect()
    }

    pub fn get_finalized_proposals(
        &self,
        from_index: &Option<u32>,
        limit: &Option<u32>,
    ) -> Vec<(u32, FinalizedProposal)> {
        let from = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(self.finalized_proposals.len());

        self.finalized_proposals
            .iter()
            .filter(|(id, _)| **id >= from)
            .take(limit as usize)
            .map(|(id, proposal)| (*id, proposal.clone()))
            .collect()
    }
}

fn hash(manifesto: String) -> String {
    let mut hasher = Sha256::new();
    hasher.update(manifesto);
    let hash = hasher.finalize();
    encode(hash)
}

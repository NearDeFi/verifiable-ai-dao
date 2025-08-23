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
pub struct FinalizedProposal {
    pub proposal_text: String,
    pub proposal_result: ProposalResult,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub enum ProposalResult {
    Approved,
    Rejected,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct ProposalRequest {
    pub yield_id: CryptoHash,
    pub proposal_text: String,
    pub proposal_hash: String,
}

#[near(serializers = [json])]
pub enum DaoResponse {
    Answer(ProposalResult),
    TimeOutError,
}

#[derive(serde::Deserialize, Debug)]
struct AiResponse {
    manifesto_hash: String,
    proposal_hash: String,
    vote: String,
}

const YIELD_REGISTER: u64 = 0;

#[near]
impl Contract {
    pub fn set_manifesto(&mut self, manifesto_text: String) {
        self.require_owner();
        self.manifesto = Manifesto {
            manifesto_text: manifesto_text.clone(),
            manifesto_hash: hash(manifesto_text),
        };
    }

    pub fn get_manifesto(&self) -> String {
        self.manifesto.manifesto_text.clone()
    }

    pub fn create_proposal(&mut self, proposal_text: String) {
        let proposal_hash = hash(proposal_text.clone());
        let proposal_count = self.proposal_count;

        let yield_promise = env::promise_yield_create(
            "return_external_response",
            &json!({ "proposal_id": proposal_count })
                .to_string()
                .into_bytes(),
            Gas::from_tgas(10),
            GasWeight::default(),
            YIELD_REGISTER,
        );

        let yield_id: CryptoHash = env::read_register(YIELD_REGISTER)
            .expect("read_register failed")
            .try_into()
            .expect("conversion to CryptoHash failed");

        let proposal_request = ProposalRequest {
            yield_id,
            proposal_text,
            proposal_hash,
        };

        self.pending_proposals
            .insert(proposal_count, proposal_request);
        self.proposal_count += 1;

        env::promise_return(yield_promise)
    }

    pub fn agent_vote(&mut self, yield_id: CryptoHash, response: String) {
        // Need to require agent here

        env::promise_yield_resume(&yield_id, &serde_json::to_vec(&response).unwrap());
    }

    #[private]
    pub fn return_external_response(
        &mut self,
        proposal_id: u32,
        #[callback_result] response: Result<String, PromiseError>,
    ) -> DaoResponse {
        match response {
            Ok(response) => {
                let ai_response: AiResponse = serde_json::from_str(&response).unwrap();
                let response_manifesto_hash = ai_response.manifesto_hash;
                let response_proposal_hash = ai_response.proposal_hash;
                let response_vote = ai_response.vote;

                require!(
                    response_manifesto_hash == self.manifesto.manifesto_hash,
                    "Manifesto hash mismatch"
                );
                require!(
                    response_proposal_hash
                        == self
                            .pending_proposals
                            .get(&proposal_id)
                            .unwrap()
                            .proposal_hash,
                    "Proposal hash mismatch"
                );

                // Get the proposal data before removing it
                let proposal = self.pending_proposals.get(&proposal_id).unwrap();
                let proposal_text = proposal.proposal_text.clone();

                self.pending_proposals.remove(&proposal_id);

                if response_vote == "Approved" {
                    // Add to finalized proposals as approved
                    let finalized_proposal = FinalizedProposal {
                        proposal_text,
                        proposal_result: ProposalResult::Approved,
                    };
                    self.finalized_proposals
                        .insert(proposal_id, finalized_proposal);

                    return DaoResponse::Answer(ProposalResult::Approved);
                } else if response_vote == "Rejected" {
                    // Add to finalized proposals as rejected
                    let finalized_proposal = FinalizedProposal {
                        proposal_text,
                        proposal_result: ProposalResult::Rejected,
                    };
                    self.finalized_proposals
                        .insert(proposal_id, finalized_proposal);

                    return DaoResponse::Answer(ProposalResult::Rejected);
                } else {
                    panic!("Invalid vote");
                }
            }
            Err(_) => DaoResponse::TimeOutError,
        }
    }

    pub fn get_pending_proposals(
        &self,
        from_index: &Option<u32>,
        limit: &Option<u32>,
    ) -> Vec<(CryptoHash, String)> {
        let from = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(self.proposal_count);

        (from..self.proposal_count)
            .take(limit as usize)
            .filter_map(|id| {
                self.pending_proposals
                    .get(&id)
                    .map(|request| (request.yield_id, request.proposal_text.clone()))
            })
            .collect()
    }

    pub fn get_finalized_proposals(
        &self,
        from_index: &Option<u32>,
        limit: &Option<u32>,
    ) -> Vec<FinalizedProposal> {
        let from = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(self.proposal_count);

        (from..self.proposal_count)
            .take(limit as usize)
            .filter_map(|id| {
                self.finalized_proposals
                    .get(&id)
                    .map(|proposal| proposal.clone())
            })
            .collect()
    }
}

fn hash(manifesto: String) -> String {
    let mut hasher = Sha256::new();
    hasher.update(manifesto);
    let hash = hasher.finalize();
    encode(hash)
}

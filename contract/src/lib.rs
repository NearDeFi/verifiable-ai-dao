use dao::{FinalizedProposal, Manifesto, ProposalRequest};
use dcap_qvl::{verify, QuoteCollateralV3};
use hex::{decode, encode};
use near_sdk::{
    env::{self, block_timestamp},
    near, require,
    store::{IterableMap, IterableSet},
    AccountId, BorshStorageKey, CryptoHash, Gas, GasWeight, NearToken, PanicOnDefault, Promise,
    PromiseError, PromiseOrValue,
};

mod collateral;
mod dao;

#[derive(BorshStorageKey)]
#[near]
pub enum StorageKey {
    ApprovedCodehashes,
    WorkerByAccountId,
    PendingProposals,
    FinalizedProposals,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct Worker {
    checksum: String,
    codehash: String,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub owner_id: AccountId,
    pub approved_codehashes: IterableSet<String>,
    pub worker_by_account_id: IterableMap<AccountId, Worker>,
    pub manifesto: Manifesto,
    pub pending_proposals: IterableMap<u32, ProposalRequest>,
    pub finalized_proposals: IterableMap<u32, FinalizedProposal>,
    pub current_proposal_id: u32,
}

#[near]
impl Contract {
    #[init]
    #[private]
    pub fn init(owner_id: AccountId) -> Self {
        Self {
            owner_id,
            approved_codehashes: IterableSet::new(StorageKey::ApprovedCodehashes),
            worker_by_account_id: IterableMap::new(StorageKey::WorkerByAccountId),
            manifesto: Manifesto {
                manifesto_text: String::from(""),
                manifesto_hash: String::from(""),
            },
            pending_proposals: IterableMap::new(StorageKey::PendingProposals),
            finalized_proposals: IterableMap::new(StorageKey::FinalizedProposals),
            current_proposal_id: 0,
        }
    }

    pub fn approve_codehash(&mut self, codehash: String) {
        self.require_owner();
        self.approved_codehashes.insert(codehash);
    }

    pub fn register_agent(
        &mut self,
        quote_hex: String,
        collateral: String,
        checksum: String,
        tcb_info: String,
    ) -> bool {
        let collateral = collateral::get_collateral(collateral);
        let quote = decode(quote_hex).unwrap();
        let now = block_timestamp() / 1000000000;
        let result = verify::verify(&quote, &collateral, now).expect("report is not verified");
        let report = result.report.as_td10().unwrap();
        let report_data = format!("{}", String::from_utf8_lossy(&report.report_data));

        // Verify the predecessor matches the report data
        require!(
            env::predecessor_account_id() == report_data,
            format!("predecessor_account_id != report_data: {}", report_data)
        );

        let rtmr3 = encode(report.rt_mr3.to_vec());
        let (shade_agent_api_image, shade_agent_app_image) =
            collateral::verify_codehash(tcb_info, rtmr3);

        // Verify the code hashes are approved
        require!(self.approved_codehashes.contains(&shade_agent_api_image));
        require!(self.approved_codehashes.contains(&shade_agent_app_image));

        let predecessor = env::predecessor_account_id();
        self.worker_by_account_id.insert(
            predecessor,
            Worker {
                checksum,
                codehash: shade_agent_app_image,
            },
        );

        true
    }

    pub fn get_agent(&self, account_id: AccountId) -> Worker {
        self.worker_by_account_id
            .get(&account_id)
            .expect("no worker found")
            .to_owned()
    }

    fn require_owner(&mut self) {
        require!(env::predecessor_account_id() == self.owner_id);
    }

    fn require_approved_codehash(&mut self) {
        let worker = self.get_agent(env::predecessor_account_id());
        require!(self.approved_codehashes.contains(&worker.codehash));
    }
}

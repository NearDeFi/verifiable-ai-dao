Build contract 

docker run --rm -v "$(pwd)":/workspace pivortex/near-builder@sha256:cdffded38c6cff93a046171269268f99d517237fac800f58e5ad1bcd8d6e2418 cargo near build non-reproducible-wasm


delete account 
near account delete-account im-yielding-stuff.testnet beneficiary pivortex.testnet network-config testnet sign-with-legacy-keychain send

create account 
near account create-account sponsor-by-faucet-service im-yielding-stuff.testnet autogenerate-new-keypair save-to-legacy-keychain network-config testnet create

deploy contract and init 
near contract deploy im-yielding-stuff.testnet use-file target/near/contract.wasm with-init-call init json-args '{"owner_id": "pivortex.testnet"}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send

set manifesto
near contract call-function as-transaction im-yielding-stuff.testnet set_manifesto json-args '{"manifesto_text": "you only approve on gaming proposals, reject everything else"}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as pivortex.testnet network-config testnet sign-with-legacy-keychain send

create proposal
near contract call-function as-transaction im-yielding-stuff.testnet create_proposal json-args '{"proposal_text": "hello"}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as pivortex.testnet network-config testnet sign-with-legacy-keychain send

check for pending proposals 
near contract call-function as-read-only im-yielding-stuff.testnet get_pending_proposals json-args {} network-config testnet now

check for finalized proposals
near contract call-function as-read-only im-yielding-stuff.testnet get_finalized_proposals json-args {} network-config testnet now












---

deploy
shade-agent-cli --wasm contract/target/near/contract.wasm --funding 10

set manifesto
near contract call-function as-transaction ac-sandbox.very-shady-account.testnet set_manifesto json-args '{"manifesto_text": "you only approve on gaming proposals, reject everything else"}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as very-shady-account.testnet network-config testnet sign-with-seed-phrase 'ethics jazz stand net else dinosaur swim seat diagram stay olympic tilt' --seed-phrase-hd-path 'm/44'\''/397'\''/0'\''' send

create proposal
near contract call-function as-transaction ac-sandbox.very-shady-account.testnet create_proposal json-args '{"proposal_text": "give money?"}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as pivortex.testnet network-config testnet sign-with-legacy-keychain send

check for finalized proposals
near contract call-function as-read-only ac-sandbox.very-shady-account.testnet get_finalized_proposals json-args {} network-config testnet now

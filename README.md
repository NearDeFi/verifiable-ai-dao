# verifiable-ai-dao

> [!WARNING]  
> This technology has not yet undergone a formal audit. Please conduct your own due diligence and exercise caution before integrating or relying on it in production environments.

This example shows how ...

Uses verifiable ai (not actually verified yet TODO) 
yield and resume 

The agents are now a part of the contract basically.

---

## Prerequisites

- First `clone` this repository

    ```bash
    git clone https://github.com/NearDeFi/verifiable-ai-dao
    cd verifiable-ai-dao
    ```

- Install NEAR and Shade Agent tooling:

    ```bash
    # Install the NEAR CLI
    curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/near-cli-rs/releases/latest/download/near-cli-rs-installer.sh | sh

    # Install the Shade Agent CLI
    npm i -g @neardefi/shade-agent-cli
    ```

- Create a `NEAR testnet account` and record the account name and `seed phrase`:

    ```bash
    export ACCOUNT_ID=example-name.testnet
    near account create-account sponsor-by-faucet-service $ACCOUNT_ID autogenerate-new-keypair save-to-keychain network-config testnet create
    ```

    replacing `example-name.testnet` with a unique account Id

- Set up Docker if you have not already:

  - Install Docker for [Mac](https://docs.docker.com/desktop/setup/install/mac-install/) or [Linux](https://docs.docker.com/desktop/setup/install/linux/) and create an account

  - Log in to Docker, using `docker login` for Mac or `sudo docker login` for Linux

- Set up a free Phala Cloud account at https://cloud.phala.network/register, then get an API key from https://cloud.phala.network/dashboard/tokens

- Get a NEAR AI API key at https://cloud.near.ai/dashboard/keys (you will need to fund your account)

---

## Set up

- Rename the `.env.development.local.example` file name to `.env.development.local` and configure your environment variables

- Start up Docker:

    For Mac

    Simply open the Docker Desktop application or run:

    ```bash
    open -a Docker
    ```

    For Linux

    ```bash
    sudo systemctl start docker
    ```

- Install dependencies 

  ```bash
  npm i
  ```

---

## Local development

- [Comment out the require approved code hash line](./contract/src/dao.rs#L106) so it works for local deployment

- Compile the contract

    For Mac

    ```bash
    cd contract
    docker run --rm -v "$(pwd)":/workspace pivortex/near-builder@sha256:cdffded38c6cff93a046171269268f99d517237fac800f58e5ad1bcd8d6e2418 cargo near build non-reproducible-wasm
    ```

    For Linux

    ```bash
    cd contract
    cargo near build non-reproducible-wasm
    ``` 

- Make sure the `NEXT_PUBLIC_contractId` prefix is set to `ac-proxy.` followed by your NEAR accountId

- In one terminal, run the Shade Agent CLI with the wasm flag to deploy a custom contract and funding flag:

  ```bash
  shade-agent-cli --wasm contract/target/near/contract.wasm --funding 7 
  ```

  The CLI on Linux may prompt you to enter your `sudo password`.

- In another terminal, start your app:

  ```bash
  npm run dev
  ```

---

### TEE Deployment

- [Re-introduce the require approved code hash line](./contract/src/dao.rs#L106) so it requires the agent to be running in a TEE

- Compile the contract

    For Mac

    ```bash
    cd contract
    docker run --rm -v "$(pwd)":/workspace pivortex/near-builder@sha256:cdffded38c6cff93a046171269268f99d517237fac800f58e5ad1bcd8d6e2418 cargo near build non-reproducible-wasm
    ```

    For Linux

    ```bash
    cd contract
    cargo near build non-reproducible-wasm
    ``` 

- Change the `NEXT_PUBLIC_contractId` prefix to `ac-sandbox.` followed by your NEAR accountId.

- Run the Shade Agent CLI with the wasm flag to deploy a custom contract and funding flag

    ```bash
    shade-agent-cli --wasm contract/target/near/contract.wasm --funding 7
    ```

    The CLI on Linux may prompt you to enter your `sudo password`.

---

## Interacting with the protocol

- Set the manifesto in the contract

    ```bash
    near contract call-function as-transaction <contractId> set_manifesto json-args '{"manifesto_text": "You only approve gaming related proposals, reject everything else"}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as <accountId> network-config testnet sign-with-seed-phrase '<seed phrase>' --seed-phrase-hd-path 'm/44'\''/397'\''/0'\''' send
    ```

    Replacing the <contractId> (ac-sandbox.NEAR_ACCOUNT_ID), <accountId> (NEAR_ACCOUNT_ID), <seed phrase>, and optionally the manifesto text.

- Set your contractId in the frontend's [config.js](./frontend/src/config.js) file

- Start the frontend

```bash
cd frontend
npm i
npm run dev
```
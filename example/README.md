# Confidential AI API Example

## Prerequisites

- Node.js 18+ and npm
- At least $5 in your Confidential AI account
- API key from the Confidential AI dashboard

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your API key:
   ```env
   API_KEY=your_actual_api_key_here
   ```

## Usage

### Run the example:
```bash
npm start
```

## What the Example Does

1. **Gets Attestation Report**: Retrieves cryptographic proof that the model runs in secure hardware
2. **Verifies NVIDIA Attestation**: Sends the NVIDIA payload to NVIDIA's attestation service
3. **Displays Intel Quote**: Shows the Intel TDX attestation quote for verification
4. **Makes Chat Request**: Sends a message to the AI model running in GPU TEE
5. **Gets Signature**: Retrieves the cryptographic signature for the response
6. **Verifies Signature**: Performs local verification and provides Etherscan instructions

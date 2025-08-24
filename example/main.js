import dotenv from 'dotenv';
import {
  getAttestationReport,
  verifyNvidiaAttestation,
  makeChatRequest,
  getSignature,
  verifySignature,
  // MODEL,
  // DEFAULT_CHAT_MESSAGE,
} from './confidential_ai_functions.js';

dotenv.config();

async function retryOperation(operation, operationName, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting ${operationName} (attempt ${attempt}/${maxRetries})`);
      return await operation();
    } catch (error) {
      console.error(`${operationName} failed (attempt ${attempt}/${maxRetries}):`, error.message);
      if (attempt === maxRetries) {
        console.error(`❌ ${operationName} failed after ${maxRetries} attempts. Exiting.`);
        process.exit(1);
      }
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function main() {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error(`API_KEY is required. Please set it in your .env file.`);
    process.exit(1);
  }
  
  try {
    // Get attestation report with retry
    const attestation = await retryOperation(
      () => getAttestationReport(apiKey),
      'Get attestation report'
    );
    
    // Verify NVIDIA attestation with retry
    await retryOperation(
      () => verifyNvidiaAttestation(attestation.nvidia_payload),
      'Verify NVIDIA attestation'
    );
    
    // Verify Intel attestation
    // TODO: No known API for this yet
    // await verifyIntelAttestation(attestation.intel_quote);

    // Make chat request with retry
    const chatResult = await retryOperation(
      () => makeChatRequest(apiKey),
      'Make chat request'
    );
    
    console.log('\n📋 Chat Summary:');
    console.log(`Response ID: ${chatResult.responseId}`);
    console.log(`Model: ${chatResult.modelName}`);
    console.log(`Full Response: ${chatResult.fullResponse}`);
    
    // Get signature with retry
    const signature = await retryOperation(
      () => getSignature(apiKey, chatResult.responseId),
      'Get signature'
    );
    
    console.log('Signature:', signature);
    
    // Verify signature with retry
    const chatRequest = {
      "messages": [
        {
          "content": "You respond with yes or no, you don't say anything else just respond with yes or no.",
          "role": "system"
        },
        {
          "content": "Is the sky blue?",
          "role": "user"
        }
      ],
      "stream": true,
      "model": "phala/deepseek-chat-v3-0324"
    };
    
    const requestBody = JSON.stringify(chatRequest);
    const signatureValid = await retryOperation(
      () => verifySignature(signature, attestation.signing_address, requestBody, chatResult.rawResponseData),
      'Verify signature'
    );
    
    console.log('Signature valid:', signatureValid);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();

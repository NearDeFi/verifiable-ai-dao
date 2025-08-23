import dotenv from 'dotenv';
import {
  getAttestationReport,
  verifyNvidiaAttestation,
  makeChatRequest,
  getSignature,
  verifySignatureLocally,
  MODEL,
  DEFAULT_CHAT_MESSAGE,
} from './confidential_ai_functions.js';

dotenv.config();

async function retryOperation(operation, operationName, maxRetries = 5) {
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
  const apiKey = process.env.API_KEY || '';

  if (!apiKey) {
    console.error('❌ API_KEY is required. Please set it in your .env file.');
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
    // TODO: No known api for this yet
    // await verifyIntelAttestation(attestation.intel_quote);

    // Make chat request with retry
    const chatRequest = {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: DEFAULT_CHAT_MESSAGE }
      ],
      model: MODEL
    };
    
    const { responseId, rawResponseData, requestForHashing } = await retryOperation(
      () => makeChatRequest(apiKey, DEFAULT_CHAT_MESSAGE),
      'Make chat request'
    );
    
    // Get signature with retry
    const signature = await retryOperation(
      () => getSignature(apiKey, responseId),
      'Get signature'
    );
    
    // Verify signature with retry
    const requestBody = JSON.stringify(requestForHashing);
    await retryOperation(
      () => verifySignatureLocally(signature, requestBody, rawResponseData),
      'Verify signature'
    );
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();

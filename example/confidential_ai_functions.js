import axios from 'axios';
import crypto from 'crypto';
import { ethers } from 'ethers';

// Constants - everything except API key
const BASE_URL = 'https://api.redpill.ai/v1';
const MODEL = 'phala/deepseek-chat-v3-0324';
const DEFAULT_CHAT_MESSAGE = "Hello, what is the biggest tree in the world? Keep the answer very short.";
const NVIDIA_ATTESTATION_URL = 'https://nras.attestation.nvidia.com/v3/attest/gpu';

/**
 * Get headers for API requests
 */
function getHeaders(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'accept': 'application/json'
  };
}

/**
 * Get attestation report for the model
 */
async function getAttestationReport(apiKey) {  
  try {
    const response = await axios.get(
      `${BASE_URL}/attestation/report?model=${MODEL}`,
      { headers: getHeaders(apiKey) }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to get attestation report:', error);
    throw error;
  }
}

/**
 * Verify NVIDIA attestation
 */
async function verifyNvidiaAttestation(nvidiaPayload) {
  try {
    const response = await axios.post(
      NVIDIA_ATTESTATION_URL,
      nvidiaPayload,
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      }
    );

    // TODO Check the attestation from Nvidia is actually valid
  } catch (error) {
    console.error('Failed to verify NVIDIA attestation:');
    throw error;
  }
}

/**
 * Make a chat request to the model
 */
async function makeChatRequest(apiKey, message) {
  console.log('\nMaking chat request');
  
  // Create request body for hashing (without stream field)
  const requestForHashing = {
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant.'
      },
      {
        role: 'user',
        content: message
      }
    ],
    model: MODEL
  };

  // Create request body for API call (with stream field to match private-ml-sdk)
  const chatRequest = {
    ...requestForHashing,
    stream: true
  };

  // Debug: Log exactly what we're sending
  console.log('\n📤 Debug - What we are sending to API:');
  console.log(`   Request: ${JSON.stringify(chatRequest, null, 2)}`);
  console.log(`   Request for hashing: ${JSON.stringify(requestForHashing, null, 2)}`);

  try {
    // Capture the exact request body bytes that axios will send
    let exactRequestBodyBytes = null;
    
    // Add a request interceptor to capture the serialized request body
    const interceptorId = axios.interceptors.request.use((config) => {
      if (config.url?.includes('/chat/completions')) {
        // Axios serializes the data to JSON string, capture it
        exactRequestBodyBytes = typeof config.data === 'string' 
          ? config.data 
          : JSON.stringify(config.data);
      }
      return config;
    });

    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      chatRequest,
      { 
        headers: getHeaders(apiKey),
        responseType: 'stream'
      }
    );

    // Remove the interceptor after use
    axios.interceptors.request.eject(interceptorId);

    let fullResponse = '';
    let rawResponseData = '';
    let responseId = '';
    let actualModel = '';

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        rawResponseData += chunkStr; // Capture raw response data (like private-ml-sdk)
        
        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              console.log('\n Chat request completed');
              
              console.log('\n🔍 Using request body for hashing:');
              console.log('📋 Original request for hashing:', JSON.stringify(requestForHashing));
              console.log('📋 Original request hash:', sha256(JSON.stringify(requestForHashing)));
              console.log('📋 API normalized model from:', requestForHashing.model, 'to:', actualModel);
              
              // Create the request body that the API actually signed (without stream field, with normalized model name)
              const normalizedRequestBody = JSON.stringify(requestForHashing).replace(
                `"model":"${requestForHashing.model}"`,
                `"model":"${actualModel}"`
              );
              console.log('📋 Normalized request body:', normalizedRequestBody);
              console.log('📋 Normalized request hash:', sha256(normalizedRequestBody));
              
              resolve({ 
                responseId, 
                fullResponse, 
                rawResponseData, 
                requestForHashing: normalizedRequestBody  // Use normalized model name
              });
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.id && !responseId) {
                responseId = parsed.id;
              }
              if (parsed.model && !actualModel) {
                actualModel = parsed.model;
              }
              if (parsed.choices && parsed.choices[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                fullResponse += content;
                process.stdout.write(content);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      });

      response.data.on('error', reject);
    });
  } catch (error) {
    console.error('Failed to make chat request:', error);
    throw error;
  }
}

/**
 * Get signature for a chat response
 */
async function getSignature(apiKey, responseId) {
  console.log('\nGetting signature for response');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/signature/${responseId}?model=${MODEL}&signing_algo=ecdsa`,
      { headers: getHeaders(apiKey) }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to get signature:', error);
    throw error;
  }
}

/**
 * Verify ECDSA signature using ethers.js
 */
function verifyEcdsaSignature(message, signature, signingAddress) {
  try {
    // Create message hash (Ethereum style with prefix)
    const messageHash = ethers.hashMessage(message);

    // Recover address from signature
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);

    // Compare addresses (case-insensitive)
    return recoveredAddress.toLowerCase() === signingAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
}

/**
 * Verify signature locally using proper ECDSA verification
 * Based on near-ai-cloud-example approach
 */
function verifySignatureLocally(signature, requestBody, responseBody) {
  console.log('\n🔍 Verifying signature locally...');
  
  try {
    console.log('📋 API Signature Text:', signature.text);
    console.log('📋 API Signature:', signature.signature);
    console.log('📋 API Signing Address:', signature.signing_address);
    
    // Decode what the API actually signed
    const [apiRequestHash, apiResponseHash] = signature.text.split(':');
    console.log('📋 API Request Hash:', apiRequestHash);
    console.log('📋 API Response Hash:', apiResponseHash);
    
    const expectedText = `${sha256(requestBody)}:${sha256(responseBody)}`;
    console.log('📋 Expected Text:', expectedText);
    console.log('📋 Request Body Hash:', sha256(requestBody));
    console.log('📋 Response Body Hash:', sha256(responseBody));
    console.log('📋 Full Request Body:', requestBody);
    console.log('📋 Full Response Body:', responseBody.substring(0, 200) + '...');

    
    // Verify the ECDSA signature using the API's provided text
    const signatureValid = verifyEcdsaSignature(
      signature.text,  
      signature.signature,
      signature.signing_address
    );

    console.log(signatureValid)

    return true;
    
  } catch (error) {
    console.error('❌ Signature verification error:', error.message);
    return false;
  }
}

/**
 * Calculate SHA256 hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export {
  getAttestationReport,
  verifyNvidiaAttestation,
  makeChatRequest,
  getSignature,
  verifySignatureLocally,
  MODEL,
  DEFAULT_CHAT_MESSAGE,
};

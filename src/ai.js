import axios from 'axios';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { generateObject } from 'ai';

const BASE_URL = 'https://api.redpill.ai/v1';
const MODEL = 'phala/deepseek-chat-v3-0324';
const NVIDIA_ATTESTATION_URL = 'https://nras.attestation.nvidia.com/v3/attest/gpu';

const manifesto = "manifesto";
const proposal = "proposal";

const message = `
Manifesto: ${manifesto}
Proposal: ${proposal}
`

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
   * Handle streaming chat response
   */
  async function handleStreamingChatResponse(response) {
    let fullResponse = '';
    let responseId = null;
    let modelName = null;
    let rawResponseData = '';
  
    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        rawResponseData += chunkStr;
        
        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
              resolve({
                responseId,
                modelName,
                fullResponse,
                rawResponseData: rawResponseData
              });
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              // Extract response ID from first chunk
              if (!responseId && parsed.id) {
                responseId = parsed.id;
              }
              
              // Extract model name
              if (!modelName && parsed.model) {
                modelName = parsed.model;
              }
              
              // Extract content from choices
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                fullResponse += parsed.choices[0].delta.content;
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON lines
            }
          }
        }
      });
  
      response.data.on('end', () => {
        if (!fullResponse) {
          reject(new Error('No response received'));
        }
      });
  
      response.data.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Make a chat request using AI SDK with structured enum output
   */
  async function makeChatRequest(apiKey) {
    console.log('\nMaking chat request with AI SDK');
    
    try {
      const { object } = await generateObject({
        model: MODEL,
        output: 'enum',
        enum: ['Approved', 'Rejected'],
        prompt: `You are a Decentralized Autonomous Organization (DAO) agent. You are responsible for making decisions on behalf of the DAO. Each prompt will contain the manifesto you use to vote and a proposal that you will vote on. You will vote on the proposal based on the manifesto.

Manifesto: ${manifesto}
Proposal: ${proposal}

Vote on this proposal based on the manifesto.`,
        api: {
          baseURL: BASE_URL,
          headers: getHeaders(apiKey)
        }
      });

      const requestBody = JSON.stringify({
        model: MODEL,
        output: 'enum',
        enum: ['Approved', 'Rejected'],
        prompt: `You are a Decentralized Autonomous Organization (DAO) agent. You are responsible for making decisions on behalf of the DAO. Each prompt will contain the manifesto you use to vote and a proposal that you will vote on. You will vote on the proposal based on the manifesto.

Manifesto: ${manifesto}
Proposal: ${proposal}

Vote on this proposal based on the manifesto.`
      });

      const hash = crypto.createHash("sha256").update(requestBody, "utf8").digest("hex");
      console.log("Request body hash:", hash);
      
      return {
        responseId: null, // AI SDK doesn't provide this directly
        modelName: MODEL,
        fullResponse: object, // This will be exactly "Approved" or "Rejected"
        rawResponseData: JSON.stringify({ vote: object }),
        requestBody: requestBody,
      };

    } catch (error) {
      console.error('Failed to make chat request:', error);
      throw error;
    }
  }
  
  /**
   * Get signature for a chat response
   */
  async function getSignature(apiKey, responseId) {
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
  function verifySignature(signature, addressFromAttestation, requestBody, responseBody) {
    console.log('\n🔍 Verifying signature locally...');
    
    try {
      // Hash request and response separately
      console.log('Request body:', requestBody);
      console.log('Response body:', responseBody);
      const requestHash = sha256(requestBody);
      const responseHash = sha256(responseBody);
      const expectedText = `${requestHash}:${responseHash}`;
  
      const signatureValid = verifyEcdsaSignature(
        signature.text,  
        signature.signature,
        signature.signing_address
      );
  
      console.log("Is signature valid?", signatureValid);
      console.log("Singature message hash:", signature.text);
      console.log("My message hash:", expectedText);
      console.log("Signature address:", signature.signing_address);
      console.log("Address from attestation:", addressFromAttestation);
  
      return signatureValid;
      
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
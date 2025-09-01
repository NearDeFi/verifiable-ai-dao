import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import dotenv from "dotenv";
import { agentInfo } from '@neardefi/shade-agent-js';
import { responder } from "./responder.js";

// Load environment variables from .env file (only needed for local development)
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.development.local" });
}

const app = new Hono();

// Configure CORS to restrict access to the server
app.use(cors());

// Health check
app.get("/", (c) => c.json({ message: "App is running" }));

async function startResponder() {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log("Looping check if registered")
  try {
    const res = await agentInfo();
    const checksum = res.checksum;
    
    if (checksum && checksum !== null && checksum !== undefined) {
      console.log("Starting responder");
      responder();
      break;
    }
    
  } catch (error) {
      console.error("Error in checksum loop:", error);
    }
  }
}

const port = Number(process.env.PORT || "3000");

console.log(`App is running on port ${port}`);

startResponder();

serve({ fetch: app.fetch, port });

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import dotenv from "dotenv";
import { agentInfo } from '@neardefi/shade-agent-js';
import { responder } from "./responder";

// Load environment variables from .env file (only needed for local development)
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.development.local" });
}

const app = new Hono();

// Configure CORS to restrict access to the server
app.use(cors());

// Health check
app.get("/", (c) => c.json({ message: "App is running" }));

// Set port
const port = Number(process.env.PORT || "3000");
console.log(`App is running on port ${port}`);

async function startResponder() {
  if (process.env.NODE_ENV === "production") { // If in production wait until agent is registered to start the responder
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log("Looping check if registered")
      try {
        const res = await agentInfo();
        const checksum = res.checksum;
        
        if (checksum && checksum !== null && checksum !== undefined) {
          break;
        }
      } catch (error) {
        console.error("Error in checksum loop:", error);
      }
    }
  }
  console.log("Starting responder");
  responder();
}

startResponder();

serve({ fetch: app.fetch, port });

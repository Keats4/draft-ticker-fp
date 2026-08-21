#!/usr/bin/env node
/** Spawns the server over stdio exactly as an MCP client would, lists the
 *  tools, calls all three, and prints the results. Verification only. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverPath = join(dirname(fileURLToPath(import.meta.url)), "server.mjs");
const transport = new StdioClientTransport({ command: "node", args: [serverPath] });
const client = new Client({ name: "test-client", version: "0.0.1" });
await client.connect(transport);

const tools = await client.listTools();
console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "));

const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args });
  console.log(`\n===== ${name} =====`);
  console.log(res.content[0].text);
};

await call("get_market_movers");
await call("get_player_market_context", { name: "Jonathon Brooks" });
await call("get_recent_events");
await client.close();

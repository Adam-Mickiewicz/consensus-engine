import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  const body = await req.json();
  const { model = "claude-sonnet-4-6", max_tokens = 2000, messages, system } = body;
  const params = { model, max_tokens, messages };
  if (system) params.system = system;
  const response = await client.messages.create(params);
  return NextResponse.json(response);
}

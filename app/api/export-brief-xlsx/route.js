import { NextResponse } from "next/server";

export async function POST(req) {
  const brief = await req.json();
  return NextResponse.json({ brief });
}

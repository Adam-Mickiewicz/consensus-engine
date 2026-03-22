import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../lib/supabase/server";
import { recalculateAllLTV } from "../../../../lib/crm/etl";

export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = getServiceClient();
    const result = await recalculateAllLTV(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[recalculate-ltv]", err?.message);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

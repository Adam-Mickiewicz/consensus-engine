import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../lib/supabase/server";

export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc('recalculate_all_ltv');
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    console.error("[recalculate-ltv]", err?.message);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

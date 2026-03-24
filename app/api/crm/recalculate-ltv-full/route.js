import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../lib/supabase/server";

export const maxDuration = 300;

export async function POST() {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase.rpc("recalculate_all_ltv");
    if (error) throw new Error(error.message);

    const total_ltv = data?.total_ltv ?? 0;
    const updated   = data?.updated   ?? 0;

    return NextResponse.json({ success: true, updated, total_ltv });
  } catch (err) {
    console.error("[recalculate-ltv-full]", err?.message);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("category_mapping")
    .select("id, keyword, category_id, created_at")
    .order("keyword", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ rows: data ?? [] });
}

export async function POST(request) {
  const supabase = getServiceClient();
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const keyword = String(body?.keyword ?? "").toLowerCase().trim();
  const category_id = String(body?.category_id ?? "").trim().toUpperCase();

  if (!keyword || !category_id) {
    return Response.json({ error: "keyword i category_id są wymagane" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("category_mapping")
    .insert({ keyword, category_id })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ row: data });
}

export async function DELETE(request) {
  const supabase = getServiceClient();
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = Number(body?.id);
  if (!id) {
    return Response.json({ error: "id jest wymagane" }, { status: 400 });
  }

  const { error } = await supabase
    .from("category_mapping")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

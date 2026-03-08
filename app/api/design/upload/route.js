import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title");
    const description = formData.get("description");
    const category = formData.get("category");
    const productType = formData.get("product_type") || "";
    const targetAudience = formData.get("target_audience") || "";
    const styleTags = formData.get("style_tags") || "";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9.]/g, "_");

    const { error: uploadError } = await supabase.storage
      .from("design-library")
      .upload(filename, buffer, { contentType: file.type });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from("design-library").getPublicUrl(filename);
    const imageUrl = urlData.publicUrl;
    const tagsArray = styleTags.split(",").map(t => t.trim()).filter(Boolean);

    const { data, error } = await supabase.from("design_library").insert([{
      title, description, category,
      product_type: productType,
      target_audience: targetAudience,
      style_tags: tagsArray,
      image_url: imageUrl,
    }]).select().single();

    if (error) throw new Error(error.message);
    return Response.json({ success: true, item: data });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

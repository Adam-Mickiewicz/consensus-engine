import sharp from "sharp";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing ?url= parameter", { status: 400 });
  }

  let imageBuffer;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    imageBuffer = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    return new Response(`Failed to fetch image: ${err.message}`, { status: 502 });
  }

  try {
    const optimized = await sharp(imageBuffer)
      .resize({ width: 300, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    return new Response(optimized, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(`Image processing failed: ${err.message}`, { status: 500 });
  }
}

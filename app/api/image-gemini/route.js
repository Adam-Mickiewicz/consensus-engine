export async function POST(request) {
  try {
    const body = await request.text();
    const { prompt } = JSON.parse(body);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: "9:16",
              imageSize: "1K",
            },
          },
        }),
      }
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart) throw new Error("Brak obrazu w odpowiedzi Gemini");

    const base64 = imagePart.inlineData.data;
    const imageUrl = `data:image/png;base64,${base64}`;

    return Response.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Gemini Image API Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

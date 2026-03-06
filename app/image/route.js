export async function POST(request) {
  try {
    const body = await request.text();
    const { problem, consensus } = JSON.parse(body);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Based on this problem and consensus, create a detailed DALL-E image prompt that visually represents the key insights. Return ONLY the image prompt, nothing else.\n\nProblem: ${problem}\n\nConsensus: ${consensus}`,
        }],
      }),
    });

    const anthropicData = await anthropicRes.json();
    const imagePrompt = anthropicData.content?.[0]?.text?.trim() || "Abstract visualization of AI consensus";

    const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
      }),
    });

    const dalleData = await dalleRes.json();
    if (dalleData.error) throw new Error(dalleData.error.message);

    return Response.json({ success: true, imageUrl: dalleData.data[0].url, imagePrompt });

  } catch (error) {
    console.error("Image API Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
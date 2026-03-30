import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Jesteś ekspertem od prompt engineeringu dla generatywnych modeli wideo i obrazów.
Pomagasz tworzyć prompty dla marki Nadwyraz.com — polska marka sprzedająca skarpety narracyjne i produkty literacko-kulturalne.

Styl marki: ciepły, literacki, nieco surrealistyczny. Produkty: skarpety z wzorami, kultura, literatura.
Ton: storytelling, nie reklama. Nacisk na nastrój i emocję, nie na features produktu.

Gdy generujesz prompt wideo:
- Opisuj ruch, światło, atmosferę — nie tylko produkt
- Uwzględnij wybrany styl wizualny i ruch kamery z parametrów
- Jeśli jest brief muzyczny — dodaj go jako ostatni akapit promptu po separatorze "Muzyka:"
- Długość promptu: 3-6 zdań. Nie za długi.
- Język promptu: angielski (modele lepiej rozumieją EN)

Zwróć TYLKO tablicę JSON z alternatywnymi promptami, bez żadnego tekstu przed ani po.
Format: ["prompt1", "prompt2", "prompt3"]`;

function cleanJSON(text) {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, instruction, model: aiModel = 'claude', context = {} } = body;

    if (!prompt && !instruction) {
      return NextResponse.json({ error: 'prompt or instruction is required' }, { status: 400 });
    }

    const userMessage = `Prompt bazowy: "${prompt || ''}"

Instrukcja: ${instruction || 'Zaproponuj 3 warianty tego promptu'}

Kontekst:
- Model wideo/obrazu: ${context.selectedModel?.model_name || 'nieznany'}
- Styl wizualny: ${context.params?.visual_style || 'brak'}
- Ruch kamery: ${context.params?.camera_move || 'brak'}
- Orientacja: ${context.params?.orientation || 'brak'}
- Czas trwania: ${context.params?.duration || 'brak'}
- Brief muzyczny: ${context.params?.music_brief || 'brak'}`;

    let alternatives = [];

    if (aiModel === 'claude') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });
      const raw = response.content[0]?.text || '[]';
      try {
        alternatives = JSON.parse(cleanJSON(raw));
        if (!Array.isArray(alternatives)) throw new Error('not array');
      } catch {
        alternatives = [raw.trim()];
      }
    } else {
      // OpenAI models: gpt-4o, gpt-4.1, o3
      const modelMap = {
        'gpt-4o': 'gpt-4o',
        'gpt-4.1': 'gpt-4.1',
        'o3': 'o3',
      };
      const openaiModel = modelMap[aiModel] || 'gpt-4o';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || '[]';
      try {
        alternatives = JSON.parse(cleanJSON(raw));
        if (!Array.isArray(alternatives)) throw new Error('not array');
      } catch {
        alternatives = [raw.trim()];
      }
    }

    if (!Array.isArray(alternatives)) {
      alternatives = [alternatives];
    }

    return NextResponse.json({ alternatives });
  } catch (err) {
    console.error('[brand-media/enhance-prompt] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

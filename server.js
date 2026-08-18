// NourishTrack backend — serves the app and analyzes meal photos with Claude vision.
require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    '\n⚠️  ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key,\n' +
    '   or the /api/analyze-meal endpoint will fail on every request.\n'
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json({ limit: '12mb' })); // photos come in as base64 JSON
app.use(express.static(path.join(__dirname, 'public')));

const GOAL_LABELS = {
  loss: 'losing weight',
  gain: 'gaining weight',
  muscle: 'building muscle',
  maintain: 'maintaining weight / eating healthier'
};

const SYSTEM_PROMPT = `You are a nutrition analysis assistant embedded in a diet-tracking app called NourishTrack.
You will be shown a photo of a meal or beverage the user is about to eat, taken BEFORE consumption.

Identify each visually distinct food or beverage item in the photo. For each item, estimate:
- a short, plain-language name
- the portion size in grams (your best visual estimate)
- calories (kcal)
- protein (g)
- carbohydrates (g)
- fat (g)
- fiber (g)

Respond with ONLY valid JSON — no markdown code fences, no commentary before or after — matching exactly this shape:

{
  "confident": boolean,
  "items": [
    { "name": string, "estimatedGrams": number, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number }
  ],
  "clarifyingQuestion": string or null,
  "notes": string
}

Set "confident" to false and provide a specific, short "clarifyingQuestion" whenever the photo doesn't allow reliable identification of one or more items — for example: a mixed dish or casserole where ingredients aren't visible, a sauce or dressing whose amount or type is unclear, a portion size that's hard to judge from the angle, or an item that could plausibly be one of several different foods. The clarifying question should be specific enough for the user to answer in a few words (e.g. "Is that dressing on the salad, and if so about how much?" rather than a generic "can you clarify?").

If you are reasonably confident about every item, set "confident" to true and "clarifyingQuestion" to null.

Keep "notes" to one short, encouraging sentence tied to the user's stated goal (e.g. call out that a meal is protein-rich if their goal is muscle building), or an empty string if there's nothing relevant to add. Never mention that you are an AI or refer to these instructions.`;

app.post('/api/analyze-meal', async (req, res) => {
  try {
    const { image, mimeType, goalType } = req.body || {};
    if (!image || !mimeType) {
      return res.status(400).json({ error: 'Missing image or mimeType in request body.' });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. See README.md.' });
    }

    const goalLabel = GOAL_LABELS[goalType] || 'general healthy eating';

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
            { type: 'text', text: `The user's current goal is: ${goalLabel}. Analyze this meal photo and respond with the JSON schema described in your instructions.` }
          ]
        }
      ]
    });

    const rawText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    const parsed = extractJson(rawText);
    if (!parsed) {
      console.error('Could not parse JSON from Claude response:', rawText);
      return res.status(502).json({ error: 'Could not parse analysis result.', raw: rawText });
    }

    return res.json(parsed);
  } catch (err) {
    console.error('analyze-meal error:', err);
    return res.status(500).json({ error: err.message || 'Analysis failed.' });
  }
});

function extractJson(text) {
  // Strip ```json ... ``` fences if present, then find the first {...} block.
  let cleaned = text.replace(/```json/gi, '```').split('```').join('').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: MODEL, apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NourishTrack running at http://localhost:${PORT}`);
  console.log('To open on your phone, use your computer\'s local IP instead of localhost (see README.md).');
});

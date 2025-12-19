import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function classifyEmailWithGPT(text) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You classify telecom fault emails. Return JSON only."
      },
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0
  });

  return JSON.parse(res.choices[0].message.content);
}

const OpenAI = require("openai");
const config = require("./config");

const openai = new OpenAI({
  apiKey: config.openAiApiKey
});

module.exports = async function suggestSEO(type, content) { 

  if (type === 'alt') {
    // Generate alt text based on image context
    const prompt = `Generate a descriptive alt text for an image. 
    Image name: ${content.imageName}
    Context: ${content.context}
    Keep it concise and descriptive, under 125 characters.`;
    
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    });
    
    return res.choices[0].message.content.trim();
  }

  const prompt = type === 'title'
    ? `Suggest an SEO-friendly title under 70 characters for this page:\n\n${content}`
    : `Write a compelling meta description under 160 characters for this page:\n\n${content}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }]
  });

  return res.choices[0].message.content.trim();
};
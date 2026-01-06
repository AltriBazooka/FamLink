
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const summarizeChat = async (messages: Message[]): Promise<string> => {
  if (messages.length === 0) return "No messages to summarize.";
  
  const chatContext = messages
    .slice(-20)
    .map(m => `${m.senderName}: ${m.text}`)
    .join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following chat conversation in 2-3 sentences: \n\n${chatContext}`,
    });
    return response.text || "Could not summarize.";
  } catch (error) {
    console.error("Gemini summary error:", error);
    return "Error generating summary.";
  }
};

export const getConversationStarter = async (groupName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest a friendly icebreaker or conversation starter for a group chat named "${groupName}". Keep it short and engaging.`,
    });
    return response.text || "Hi everyone! How's it going?";
  } catch (error) {
    return "Hi everyone! How's your day going?";
  }
};

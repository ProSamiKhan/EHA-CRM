
import { GoogleGenAI } from "@google/genai";
import { Candidate } from "../types";

export class AIService {
  static async analyzeCandidate(candidate: Candidate): Promise<string> {
    // Always use new GoogleGenAI({apiKey: process.env.API_KEY})
    // Use the API key string directly from the environment.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    try {
      // Call ai.models.generateContent directly with model name and prompt parts.
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this student admission record for English House Academy:
          Name: ${candidate.personalDetails.fullName}
          Status: ${candidate.status}
          Payment Status: ${candidate.paymentStatus}
          Total Paid: ${candidate.paymentHistory.reduce((s, p) => s + p.amount, 0)}
          Notes: ${candidate.notes || 'No notes'}
          
          Provide a professional 2-line summary and a recommendation (Success Probability).`,
        config: {
          systemInstruction: "You are an expert academic counselor for a premium English academy.",
          temperature: 0.7,
        }
      });

      // The .text property directly returns the generated string.
      return response.text || "Could not generate analysis.";
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      if (error.message?.includes("entity was not found")) {
        return "AI Error: Model or API Key configuration issue.";
      }
      return "AI Service is temporarily unavailable.";
    }
  }
}


import { GoogleGenAI } from "@google/genai";
import { Candidate } from "../types";

export class AIService {
  private static ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  static async analyzeCandidate(candidate: Candidate): Promise<string> {
    if (!process.env.API_KEY) {
      throw new Error("AI Features are disabled. Please add API_KEY in environment variables.");
    }

    try {
      const response = await this.ai.models.generateContent({
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

      return response.text || "Could not generate analysis.";
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      return "AI Service is temporarily unavailable.";
    }
  }
}

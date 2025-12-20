
import { GoogleGenAI } from "@google/genai";

// Fix: Always use the exact initialization as per guidelines (must use named parameter without fallback)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface MarketInsight {
  summary: string;
  sources: { title: string; uri: string }[];
}

export const getCarMarketInsights = async (make: string, model: string, year: number): Promise<MarketInsight> => {
  try {
    const prompt = `Provide a professional market analysis for a ${year} ${make} ${model}. Include its current resale value trends, common maintenance issues, and fuel efficiency performance in the UAE market. Keep it concise and professional for a car leasing manager.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No insights available at this time.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri,
      }));

    return {
      summary: text,
      sources,
    };
  } catch (error) {
    console.error("Gemini Market Insight Error:", error);
    return {
      summary: "Error retrieving AI insights. Please check connection and API configuration.",
      sources: [],
    };
  }
};

export const getFleetPerformanceSummary = async (stats: any): Promise<string> => {
  try {
    const prompt = `Analyze these fleet statistics for iFleet CRM: 
    Active Leases: ${stats.activeLeases}, 
    Total Clients: ${stats.totalClients}, 
    Available Cars: ${stats.availableCars}, 
    Monthly Revenue: ${stats.monthlyRevenue} AED. 
    Provide 3 actionable recommendations to increase utilization and profitability. Be brief.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "No recommendations available.";
  } catch (error) {
    return "Insights could not be generated.";
  }
};

import { GoogleGenAI } from "@google/genai";

// Initialize the SDK once for the entire service
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

// ==========================================
// STAGE 1: The Extractor (Fast & Cheap)
// Transforms messy PDF text into structured database rows.
// ==========================================
const generateAISummary = async (rawText: string, profileSnapshot: any) => {
  
  // OPTIMIZATION: Deeply nested schema to guarantee exact keys for Stage 2
  const responseSchema = {
    type: "object",
    properties: {
      parsedData: { 
        type: "object",
        properties: {
          work_history: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                role: { type: "string" },
                company: { type: "string" },
                bullets: { type: "array", items: { type: "string" } }
              }
            } 
          },
          education: { type: "array", items: { type: "object" } },
          projects: { type: "array", items: { type: "object" } }
        },
        required: ["work_history", "education", "projects"]
      },
      metadata: { 
        type: "object",
        properties: {
          skills: { type: "array", items: { type: "string" } },
          experienceLevel: { type: "string", description: "e.g., Junior, Mid, Senior" }
        },
        required: ["skills", "experienceLevel"]
      },
      summary: { 
        type: "object",
        properties: {
          bio: { type: "string", description: "A 2-3 sentence professional bio." },
          tagline: { type: "string", description: "A one-line professional title." }
        },
        required: ["bio", "tagline"]
      },
    },
    required: ["parsedData", "metadata", "summary"],
  };

  try {
    const result = await ai.models.generateContent({
      model: process.env.SUMMARY_MODEL || "gemini-2.5-flash", // Flash is optimal for rapid extraction
      contents: [
        `CAREER PROFILE TARGET: ${profileSnapshot?.targetRole || "General"}`,
        `RESUME TEXT:\n${rawText.substring(0, 15000)}` // Safeguard against massive token bloat
      ],
      config: {
        systemInstruction: "You are an expert data extractor. Parse the messy resume text into clean, structured JSON. Do not invent information. If a section is missing from the resume, return an empty array.",
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0, // Zero variance for data extraction
      },
    });

    if (!result.text) {
      throw new Error("AI returned an empty response.");
    }

    const jsonResponse = JSON.parse(result.text);

    // Defensive mapping to guarantee database integrity
    return {
      parsedData: {
        work_history: jsonResponse.parsedData?.work_history || [],
        education: jsonResponse.parsedData?.education || [],
        projects: jsonResponse.parsedData?.projects || [],
      },
      metadata: {
        skills: jsonResponse.metadata?.skills || [],
        experienceLevel: jsonResponse.metadata?.experienceLevel || "Unknown",
      },
      summary: {
        bio: jsonResponse.summary?.bio || "Professional profile pending.",
        tagline: jsonResponse.summary?.tagline || "",
      }
    };
  } catch (error: any) {
    console.error("Stage 1 Extraction Error:", error.message);
    throw new Error(`EXTRACTION_FAILED: ${error.message}`);
  }
};

// ==========================================
// STAGE 2: The Analyzer (Heavy Logic & Comparison)
// Evaluates structured data against a job description.
// ==========================================
const generateAiAnalysis = async (resume: any, target: any) => {
  
  const responseSchema = {
    type: "object",
    properties: {
      matchScore: { 
        type: "integer",
        description: "An objective score from 0 to 100 representing the resume's fit for the job description."
      },
      gapAnalysis: { 
        type: "array",
        items: {
          type: "object",
          properties: {
            missingSkill: { type: "string" },
            explanation: { type: "string" }
          },
          required: ["missingSkill", "explanation"]
        }
      },
      roadmap: { 
        type: "array",
        items: {
          type: "object",
          properties: {
            stepNumber: { type: "integer" },
            action: { type: "string" }
          },
          required: ["stepNumber", "action"]
        }
      },
      projectIdeas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            technologies: { type: "array", items: { type: "string" } }
          },
          required: ["title", "description", "technologies"]
        }
      }
    },
    required: ["matchScore", "gapAnalysis", "roadmap", "projectIdeas"],
  };

  try {
    const aiPayload = [
      `TARGET JOB DESCRIPTION:\n${target.job_description}`,
      `TARGET ROLE:\n${target.target_role} in ${target.target_country}`,
      `USER RESUME DATA:\n${JSON.stringify({
        summary: resume.summary,
        metadata: resume.meta_data,
        experience: resume.parsed_data?.work_history || [],
        education: resume.parsed_data?.education || [],
        projects: resume.parsed_data?.projects || []
      })}`
    ];

    const result = await ai.models.generateContent({
      model: process.env.ANALYSIS_MODEL || "gemini-2.5-pro", // Pro is required for complex reasoning
      contents: aiPayload,
      config: {
        systemInstruction: "You are a ruthless Applicant Tracking System (ATS) and elite Technical Career Coach. Critically evaluate the user's resume data against the job description. Do not assume skills not explicitly proven. Return ONLY valid JSON.",
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Near-zero to prevent creative hallucinations
      },
    });

    if (!result.text) {
      throw new Error("AI returned an empty response.");
    }

    const jsonResponse = JSON.parse(result.text);

    // Defensive mapping with fallback defaults
    return {
      matchScore: jsonResponse.matchScore ?? 0,
      gapAnalysis: Array.isArray(jsonResponse.gapAnalysis) ? jsonResponse.gapAnalysis : [],
      roadmap: Array.isArray(jsonResponse.roadmap) ? jsonResponse.roadmap : [],
      projectIdeas: Array.isArray(jsonResponse.projectIdeas) ? jsonResponse.projectIdeas : []
    };

  } catch (error: any) {
    console.error("Stage 2 Analysis Error:", error.message);
    throw new Error(`ANALYSIS_GENERATION_FAILED: ${error.message}`);
  }
};





export {generateAISummary, generateAiAnalysis}
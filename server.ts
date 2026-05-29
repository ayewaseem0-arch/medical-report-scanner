import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import fs from 'fs';

dotenv.config();

// Firebase initialization for backend log syncing
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firestoreDb: any = null;
try {
  if (fs.existsSync(firebaseConfigPath)) {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    const firebaseApp = initializeApp(config);
    firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
    console.log("[Firestore Backend] Initialized successfully");
  }
} catch (err) {
  console.error("[Firestore Backend] Configuration failed:", err);
}

// Helper to log backend clinical report analysis run activity
const logAnalysisRun = async (params: {
  userId?: string;
  analysisType: string;
  language: string;
  country: string;
  textLength: number;
  hasImage: boolean;
  status: string;
}) => {
  if (!firestoreDb) return;
  try {
    await addDoc(collection(firestoreDb, 'analyses_runs'), {
      userId: params.userId || 'anonymous',
      timestamp: new Date().toISOString(),
      analysisType: params.analysisType,
      language: params.language,
      country: params.country,
      textLength: params.textLength,
      hasImage: params.hasImage,
      status: params.status
    });
  } catch (err) {
    console.error("[Firestore Log] Run registration error:", err);
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Gemini AI Setup
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Retry helper for Gemini API
  const callWithRetry = async (fn: () => Promise<any>, maxRetries = 3, initialDelay = 2000) => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isTransient = error.message?.includes("503") || error.status === 503 || error.message?.includes("UNAVAILABLE") || error.message?.includes("429");
        
        if (isTransient && i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          console.warn(`Gemini API busy (503/429). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  // Resilient model caching to bypass broken models
  let preferFallbackModel = false;
  let fallbackModelExpiry = 0;

  const cleanJsonResponse = (text: string) => {
    let cleaned = (text || '').trim();
    // Safely extract the first block containing nested brackets if any prefix or suffix text exists
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    // Remove potential markdown code blocks
    return cleaned.replace(/```json\n?|```/g, '').trim();
  };

  app.post("/api/analyze-report", async (req, res) => {
    try {
      const { text, imageData, language, analysisType = 'lab', country = 'International', userId } = req.body;
      
      const typeLabels = {
        lab: 'Laboratory, Radiology & Clinical Diagnostics',
        medicine: 'Medicine Prescription/Package',
        symptoms: 'Patient Symptoms/Clinical Notes'
      };

      const promptText = `You are a medical intelligence analyzer. You are currently in "${typeLabels[analysisType as keyof typeof typeLabels]}" mode.
      Target Region/Standard: ${country}
      
      SCOPE: Pathology, Radiology, Functional Diagnostics, Medicine, and Symptoms.

      PRECISE MULTIMODAL MEDICAL OCR SYSTEM:
      If an image is provided, your absolute primary objective is professional-grade visual OCR. Read and extract all handwritten/typed chemical or metabolic elements, test names, medicine lists, values, units, reference range tables, dates, and structures with flawless accuracy. Extreme attention must be paid to decimal points, numerical boundaries, units (e.g., pg, mg/dL, pg/mL, ug/dL), and critical symbols. Do not hallucinate, merge digits, or skip parameters.

      OCR NOISE & CONVERSION CORRECTION:
      If text input is provided, recognize that it may be retrieved from noisy raw OCR. Automatically correct scanner typos, corrupted characters, or spelling anomalies (e.g., '1l0' -> '110', 'Hba1_c' or 'HbA1-C' -> 'HbA1c', 'gl0cose' -> 'glucose', 'dL' formatting issues, and broken table rows). Ensure you interpret these accurately to produce correct medical clinical listings.

      LATENCY OPTIMIZATION & LATENCY MINIMIZATION:
      We need instant, ultra-low-latency response times for the user.
      - Keep 'summary' under 25 words.
      - Keep each biomarker or ingredient 'interpretation' under 12 words.
      - Keep 'clinicalSignificance' under 15 words.
      - Limit the lists of metrics, prevention plans, remedies, associated symptoms, next steps, and warnings to a maximum of 3 items each. No more than 3!
      - Write extremely brief, punchy, compact text so that the total response is generated instantly. Do not include redundant filler or fluffy explanations. Keep all JSON keys short and concise.

      STEP 1: VALIDATION
      Check if data matches "${typeLabels[analysisType as keyof typeof typeLabels]}" mode. 
      - If mismatch, return JSON: { "error": "MISMATCH", "reason": "Detailed reason in ${language}" }
      
      STEP 2: ANALYSIS
      Analyze based on ${country} standards. Safety: NO allopathic med recommendations.
      All text MUST be in: ${language || 'English'}.

      If "Symptom Context" details (such as Severity and Duration) are appended to the input data, carefully adjust your estimates, danger/red-flag warnings, and action plan priority based on how high the severity is and how long it has been going on. For higher severity (e.g., 7-10) or long duration, highlight immediate professional care in the action plan and warnings.

      RETURN AS JSON:
      {
        "status": "success",
        "summary": "Summary string",
        "metrics": [{ 
          "name": "Name", 
          "value": "Val", 
          "unit": "Unit", 
          "referenceRange": "Ref", 
          "status": "normal|abnormal|critical|pending", 
          "interpretation": "Short summary of finding",
          "clinicalSignificance": "Comprehensive explanation of what this value signifies.",
          "unitMismatchCorrection": "Optional. Suggest corrections here if a unit mismatch/typo is detected (e.g., 'Value 5.5 suggests mmol/L instead of labeled mg/dL. Corrected: ~99 mg/dL'). Max 15 words."
        }],
        "conditions": ["List"],
        "associatedSymptoms": ["List"],
        "preventionPlan": [{ "category": "diet|exercise|lifestyle|wellness", "title": "Title", "description": "Short", "action": "Step" }],
        "traditionalRemedies": [{ "name": "Name", "description": "What it is", "context": "Origin/Cultural context or common usage context, e.g., 'Commonly used in Ayurveda for...' or 'Traditional Chinese medicine approach for...'" }],
        "concerns": ["Red flags"],
        "nextSteps": ["Follow-ups"],
        "healthTrends": "Trends string",
        "medicineInfo": {
          "indications": ["Uses"],
          "sideEffects": ["Reactions"],
          "interactions": ["Interactions"],
          "genericAlternatives": ["Salts/Generic Versions - ALWAYS include at least 2-3 if possible, if none exist return an empty array"],
          "safeUsage": "Limits",
          "warnings": ["Contraindications"],
          "doctorQuestions": ["Questions"]
        }
      }

      CRITICAL for Medicine mode: In the "genericAlternatives" field, find and list common, lower-cost generic versions of the medicine. If no generic alternative is identifiable, return an empty array.

      Data: ${text || "See attached image"}`;

      const localizedQuotaMessages: Record<string, string> = {
        en: "The precision medical analyzer is currently experiencing high demand. Please try again in 20 seconds or use a sample simulation in our sidebar!",
        es: "El analizador médico de precisión está experimentando una alta demanda. ¡Por favor, inténtelo de nuevo en 20 segundos o use una simulación de muestra!",
        fr: "L'analyseur médical de précision connaît actuellement une forte demande. Veuillez réessayer dans 20 secondes ou utiliser une simulation d'échantillon !",
        de: "Der Präzisions-Medizinanalysator ist derzeit stark ausgelastet. Bitte versuchen Sie es in 20 Sekunden erneut oder nutzen Sie eine Mustersimulation!",
        zh: "高精度医学分析仪目前需求量较大。请在 20 秒后重试，或使用侧边栏的样本模拟！",
        ar: "محلل البيانات الطبية الدقيقة يشهد حاليًا ضغطًا كبيرًا. يرجى المحاولة مرة أخرى بعد 20 ثانية أو استخدام محاكاة العينة في الشريط الجانبي!",
        hi: "सटीक चिकित्सा विश्लेषक पर वर्तमान में बहुत अधिक लोड है। कृपया 20 सेकंड में पुनः प्रयास करें या साइडबार में नमूना सिमुलेशन का उपयोग करें!",
        pt: "O analisador médico de precisão está com alta demanda no momento. Tente novamente em 20 segundos ou use uma simulação de amostra!",
        ja: "高精度医療分析装置へのアクセスが集中しています。20秒後にもう一度お試しいただくか、サイドバーのサンプルシミュレーションをご利用ください。",
        ur: "طبی تجزیہ کار پر فی الوقت لوڈ زیادہ ہے۔ براہ کرم 20 سیکنڈ بعد دوبارہ کوشش کریں یا سائیڈ بار میں موجود نمونہ کا استعمال کریں!",
        'hi-en': "Medical analyzer pe abhi load thoda zyada hai. Please 20 seconds mein firse try karein ya side-panel se sample simulate karein!",
        bn: "নির্ভুল চিকিৎসা বিশ্লেষক বর্তমানে অত্যন্ত ব্যস্ত। অনুগ্রহ করে ২০ সেকেন্ড পরে আবার চেষ্টা করুন অথবা সাইডবারের নমুনা সিমুলেশন ব্যবহার করুন!",
        ru: "Высокоточный медицинский анализатор сейчас перегружен. Пожалуйста, попробуйте снова через 20 секунд или используйте демонстрационный образец в боковой панели!"
      };

      let response;
      let modelToUse = "gemini-3.1-flash-lite";
      if (preferFallbackModel && Date.now() < fallbackModelExpiry) {
        modelToUse = "gemini-3.5-flash";
        console.log(`[Model Route] Preferring cached fallback model ${modelToUse} to bypass known primary model rate limits`);
      }
      
      try {
        response = await callWithRetry(() => ai.models.generateContent({
          model: modelToUse,
          contents: imageData 
            ? { parts: [{ text: promptText }, { inlineData: { data: imageData.split(',')[1], mimeType: imageData.split(',')[0].split(':')[1].split(';')[0] } }] }
            : promptText,
          config: {
            responseMimeType: "application/json",
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.MINIMAL
            }
          }
        }), 2, 1000);
      } catch (firstError: any) {
        const errStr = String(firstError.message || firstError).toLowerCase();
        
        if (modelToUse === "gemini-3.1-flash-lite") {
          preferFallbackModel = true;
          fallbackModelExpiry = Date.now() + 10 * 60 * 1000; // Prefer fallback for 10 minutes

          console.warn(`[Quota Exceeded] Model ${modelToUse} failed. Hitting fallback model: gemini-3.5-flash`);
          modelToUse = "gemini-3.5-flash";
          try {
            response = await callWithRetry(() => ai.models.generateContent({
              model: modelToUse,
              contents: imageData 
                ? { parts: [{ text: promptText }, { inlineData: { data: imageData.split(',')[1], mimeType: imageData.split(',')[0].split(':')[1].split(';')[0] } }] }
                : promptText,
              config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                  thinkingLevel: ThinkingLevel.MINIMAL
                }
              }
            }), 2, 1000);
          } catch (fallbackError: any) {
            console.error("Fallback model gemini-3.5-flash also failed:", fallbackError);
            const userLang = language || 'en';
            const friendlyMsg = localizedQuotaMessages[userLang] || localizedQuotaMessages['en'];
            return res.status(429).json({ error: friendlyMsg });
          }
        } else {
          console.error(`Fallback model ${modelToUse} also failed:`, firstError);
          const userLang = language || 'en';
          const friendlyMsg = localizedQuotaMessages[userLang] || localizedQuotaMessages['en'];
          return res.status(429).json({ error: friendlyMsg });
        }
      }

      const cleanedText = cleanJsonResponse(response.text);
      const analysisJson = JSON.parse(cleanedText);
      if (analysisJson.error === "MISMATCH") {
        await logAnalysisRun({
          userId,
          analysisType,
          language,
          country,
          textLength: (text || '').length,
          hasImage: !!imageData,
          status: 'mismatch'
        });
        return res.json({ analysis: "ERROR_MISMATCH " + analysisJson.reason });
      }

      await logAnalysisRun({
        userId,
        analysisType,
        language,
        country,
        textLength: (text || '').length,
        hasImage: !!imageData,
        status: 'success'
      });

      res.json({ analysisData: analysisJson });
    } catch (error: any) {
      console.error("Analysis error:", error);
      const errStr = String(error.message || error).toLowerCase();
      const isQuota = error.status === 429 || errStr.includes("429") || errStr.includes("quota") || errStr.includes("exhausted") || errStr.includes("resource_exhausted") || errStr.includes("rate limit");
      
      const textVal = req.body?.text || '';
      const hasImageVal = !!req.body?.imageData;
      const analysisTypeVal = req.body?.analysisType || 'lab';
      const languageVal = req.body?.language || 'en';
      const countryVal = req.body?.country || 'International';
      const userIdVal = req.body?.userId;

      await logAnalysisRun({
        userId: userIdVal,
        analysisType: analysisTypeVal,
        language: languageVal,
        country: countryVal,
        textLength: textVal.length,
        hasImage: hasImageVal,
        status: isQuota ? 'rate_limited' : 'error'
      });

      if (isQuota) {
        const userLang = req.body.language || 'en';
        const localizedQuotaMessages: Record<string, string> = {
          en: "The precision medical analyzer is currently experiencing high demand. Please try again in 20 seconds or use a sample simulation in our sidebar!",
          es: "El analizador médico de precisión está experimentando una alta demanda. ¡Por favor, inténtelo de nuevo en 20 segundos o use una simulación de muestra!",
          fr: "L'analyseur médical de précision connaît actuellement une forte demande. Veuillez réessayer dans 20 secondes ou utiliser une simulation d'échantillon !",
          de: "Der Präzisions-Medizinanalysator ist derzeit stark ausgelastet. Bitte versuchen Sie es in 20 Sekunden erneut oder nutzen Sie eine Mustersimulation!",
          zh: "高精度医学分析仪目前需求量较大。请在 20 秒后重试，或使用侧边栏的样本模拟！",
          ar: "محلل البيانات الطبية الدقيقة يشهد حاليًا ضغطًا كبيرًا. يرجى المحاولة مرة أخرى بعد 20 ثانية أو استخدام محاكاة العينة في الشريط الجانبي!",
          hi: "सटीक चिकित्सा विश्लेषक पर वर्तमान में बहुत अधिक लोड है। कृपया 20 सेकंड में पुनः प्रयास करें या साइडबार में नमूना सिमुलेशन का उपयोग करें!",
          pt: "O analisador médico de precisão está com alta demanda no momento. Tente novamente em 20 segundos ou use uma simulação de amostra!",
          ja: "高精度医療分析装置へのアクセスが集中しています。20秒後にもう一度お試しいただくか、サイドバーのサンプルシミュレーションをご利用ください。",
          ur: "طبی تجزیہ کار پر فی الوقت لوڈ زیادہ ہے۔ براہ کرم 20 سیکنڈ بعد دوبارہ کوشش کریں یا سائیڈ بار میں موجود نمونہ کا استعمال کریں!",
          'hi-en': "Medical analyzer pe abhi load thoda zyada hai. Please 20 seconds mein firse try karein ya side-panel se sample simulate karein!",
          bn: "নির্ভুল চিকিৎসা বিশ্লেষক বর্তমানে অত্যন্ত ব্যস্ত। অনুগ্রহ করে ২০ সেকেন্ড পরে আবার চেষ্টা করুন অথবা সাইডবারের নমুনা সিমুলেশন ব্যবহার করুন!",
          ru: "Высокоточный медицинский анализатор сейчас перегружен. Пожалуйста, попробуйте снова через 20 секунд или используйте демонстрационный образец в боковой панели!"
        };
        const friendlyMsg = localizedQuotaMessages[userLang] || localizedQuotaMessages['en'];
        return res.status(429).json({ error: friendlyMsg });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

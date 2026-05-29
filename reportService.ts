import { createWorker } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker using a local worker from the package
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const languageMap: Record<string, string> = {
  en: 'eng',
  es: 'spa',
  fr: 'fra',
  de: 'deu',
  zh: 'chi_sim',
  ar: 'ara',
  hi: 'hin',
  pt: 'por',
  ja: 'jpn',
  ur: 'urd',
  'hi-en': 'hin',
  bn: 'ben',
  ru: 'rus'
};

export async function extractTextFromImage(
  imageFile: File | string,
  onProgress?: (p: number) => void,
  language: string = 'en',
  maxRetries: number = 3
): Promise<string> {
  const mapped = languageMap[language] || 'eng';
  const ocrLanguages = mapped === 'eng' ? 'eng' : `eng+${mapped}`;

  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    let worker: any = null;
    try {
      worker = await createWorker(ocrLanguages, 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(m.progress * 150)); // Scaled slightly to account for dual languages
          }
        }
      });
      const ret = await worker.recognize(imageFile);
      await worker.terminate();
      return ret.data.text || '';
    } catch (error) {
      console.error(`OCR attempt ${attempt + 1} failed:`, error);
      lastError = error;
      if (worker) {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.error("Error terminating worker during retry:", terminateError);
        }
      }
      attempt++;
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw new Error(`OCR processing failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

export async function getPDFFirstPageAsImage(pdfFile: File): Promise<string | undefined> {
  try {
    const data = await pdfFile.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    if (pdf.numPages === 0) return undefined;
    
    const page = await pdf.getPage(1);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 2.0 });
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    if (context) {
      await page.render({ canvasContext: context as any, viewport } as any).promise;
      return canvas.toDataURL('image/jpeg', 0.85);
    }
  } catch (error) {
    console.error('Error extracting image from PDF:', error);
  }
  return undefined;
}

export async function extractTextFromPDF(pdfFile: File, onProgress?: (p: number) => void): Promise<string> {
  const data = await pdfFile.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
    if (onProgress) {
      onProgress(Math.round((i / pdf.numPages) * 100));
    }
  }

  return fullText;
}

export async function analyzeReport(text: string, imageData?: string, language: string = 'en', analysisType: string = 'lab', country: string = 'International', userId?: string) {
  const response = await fetch('/api/analyze-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, imageData, language, analysisType, country, userId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to analyze report');
  }

  return response.json();
}

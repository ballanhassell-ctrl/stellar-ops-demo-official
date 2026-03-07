import Tesseract from 'tesseract.js';

export interface OcrResult {
  checkNumber: string;
  amount: string;
  payer: string;
  rawText: string;
  confidence: number;
}

/**
 * Run OCR on an image file and extract check-related data.
 * Uses Tesseract.js for client-side text recognition.
 */
export async function extractCheckData(imageSource: File | string): Promise<OcrResult> {
  const source = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);

  try {
    const { data } = await Tesseract.recognize(source, 'eng', {
      logger: () => {}, // suppress progress logs
    });

    const rawText = data.text;
    const confidence = data.confidence;

    return {
      checkNumber: parseCheckNumber(rawText),
      amount: parseAmount(rawText),
      payer: parsePayer(rawText),
      rawText,
      confidence,
    };
  } finally {
    // Revoke the blob URL if we created one
    if (typeof imageSource !== 'string') {
      URL.revokeObjectURL(source);
    }
  }
}

// ---- Field parsers ----

function parseCheckNumber(text: string): string {
  // Look for common check number patterns:
  // "Check No. 123456", "Check #123456", "No. 12345", or a standalone 4-8 digit number near top
  const patterns = [
    /check\s*(?:no\.?|#|number)\s*[:.]?\s*(\d{3,10})/i,
    /(?:no|num)\.?\s*[:.]?\s*(\d{4,10})/i,
    /\b(\d{4,8})\b/, // fallback: first 4-8 digit number
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return '';
}

function parseAmount(text: string): string {
  // Look for dollar amounts: $1,234.56 or ** 1234.56 **
  const patterns = [
    /\$\s*([\d,]+\.\d{2})/,
    /\*{2}\s*([\d,]+\.\d{2})\s*\*{2}/,
    /([\d,]+\.\d{2})/, // fallback: any decimal number
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replace(/,/g, '');
  }
  return '';
}

function parsePayer(text: string): string {
  // Look for "Pay to the order of" line, or insurance company names
  const payToMatch = text.match(/pay\s+to\s+(?:the\s+order\s+of)?\s*[:\s]*(.*)/i);
  if (payToMatch) {
    // Clean up and return the payer name (first line only)
    return payToMatch[1].split('\n')[0].trim().substring(0, 60);
  }

  // Look for common insurance-related keywords on their own line
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const insuranceKeywords = /insurance|health|aetna|cigna|united|blue\s*cross|humana|anthem|medicare|medicaid|tricare|bcbs/i;
  for (const line of lines) {
    if (insuranceKeywords.test(line) && line.length < 80) {
      return line.substring(0, 60);
    }
  }

  return '';
}

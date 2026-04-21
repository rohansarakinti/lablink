"use client";

/** Avoid hanging the UI on pathological or huge PDFs. */
const MAX_PDF_PAGES = 100;
const PDF_EXTRACT_BUDGET_MS = 90_000;

function raceWithTimeout<T>(p: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback()), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback());
      },
    );
  });
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const numPages = Math.min(doc.numPages, MAX_PDF_PAGES);
  let text = "";
  for (let page = 1; page <= numPages; page += 1) {
    const pageData = await doc.getPage(page);
    const content = await pageData.getTextContent();
    text += `${content.items.map((item) => ("str" in item ? item.str : "")).join(" ")}\n`;
  }
  return text;
}

/**
 * Read plain text from PDF, or UTF-8/unicode text from .txt / .md.
 * PDF extraction is time- and page-bounded so the onboarding step cannot hang.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".pdf")) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return raceWithTimeout(
      (async () => {
        try {
          return await extractPdfText(bytes);
        } catch {
          return new TextDecoder("utf-8").decode(bytes);
        }
      })(),
      PDF_EXTRACT_BUDGET_MS,
      () => new TextDecoder("utf-8").decode(bytes),
    );
  }
  return file.text();
}

export interface OcrResult {
  serial: string;
  confidence: number;
  source: "remote" | "demo";
}

function generateDemoSerial() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${segment()}-${segment()}-${segment()}`;
}

export async function extractSerial(photo: string): Promise<OcrResult> {
  const endpoint = process.env.NEXT_PUBLIC_OCR_ENDPOINT;
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: photo }),
    });
    if (!response.ok) throw new Error("The OCR service could not process this image.");
    const data = (await response.json()) as { serial?: string; confidence?: number };
    if (!data.serial) throw new Error("No serial number was returned by the OCR service.");
    return { serial: data.serial, confidence: data.confidence ?? 0, source: "remote" };
  }

  await new Promise((resolve) => setTimeout(resolve, 650));
  return { serial: generateDemoSerial(), confidence: 0.91, source: "demo" };
}

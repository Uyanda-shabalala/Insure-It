import { ApiError, request } from "@/lib/api/client";

export interface OcrResult {
  serial: string;
  source: "groq" | "fallback" | "remote";
  status: "FOUND" | "REVIEW_REQUIRED";
  requiresReview: boolean;
}

/**
 * Sends the photo to POST /api/ocr/serial-number as multipart/form-data (field name "image")
 * and returns the serial number the backend read from it. Nothing is saved by this call.
 */
export async function extractSerial(photo: Blob): Promise<OcrResult> {
  const formData = new FormData();
  formData.append("image", photo, "serial-label.jpg");

  try {
    const data = await request<{ serialNumber?: string | null; status?: string; source?: string; requiresReview?: boolean }>("/api/ocr/serial-number", {
      method: "POST",
      formData,
      missingMeansUnavailable: false,
    });
    const serial = data?.serialNumber?.trim();
    if (!serial) throw new ApiError("No serial number could be detected.", 400, "NO_SERIAL_FOUND");
    return { serial, source: data?.source === "fallback" ? "fallback" : data?.source === "groq" ? "groq" : "remote",
      status: data?.status === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "FOUND", requiresReview: data?.requiresReview !== false };
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 400 && caught.body.includes("NO_SERIAL_FOUND")) {
      throw new Error("No serial number could be detected. Try another photo, or use Add device in Inventory to enter it manually.");
    }
    throw caught;
  }
}

export interface OcrResult {
  serialNumber: string;
  status: "FOUND" | "NOT_FOUND";
}

export async function extractSerial(photo: File, signal?: AbortSignal): Promise<OcrResult> {
  const endpoint = process.env.NEXT_PUBLIC_OCR_ENDPOINT?.trim() || "/api/ocr/serial-number";
  const formData = new FormData();
  formData.append("image", photo);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      signal,
    });
  } catch (caught) {
    if (signal?.aborted) throw caught;
    throw new Error("Could not reach the OCR service. Try again or enter the serial number manually.");
  }

  if (!response.ok) {
    throw new Error(`The OCR service could not process this image (HTTP ${response.status}). Try another photo or enter the serial number manually.`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("The OCR service returned an invalid response. Enter the serial number manually or try again.");
  }

  if (typeof data === "object" && data !== null && "status" in data) {
    if (data.status === "NOT_FOUND") return { serialNumber: "", status: "NOT_FOUND" };
    if (data.status === "FOUND" && "serialNumber" in data && typeof data.serialNumber === "string" && data.serialNumber.trim()) {
      return { serialNumber: data.serialNumber.trim(), status: "FOUND" };
    }
  }

  throw new Error("The OCR service returned an unexpected result. Enter the serial number manually or try again.");
}

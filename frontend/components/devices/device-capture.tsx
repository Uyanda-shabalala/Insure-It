"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
  Camera,
  CheckCircle2,
  FileImage,
  ImageIcon,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { DeviceDraft } from "@/lib/domain/device";
import { imageFileToDataUrl } from "@/lib/services/image-service";
import { extractSerial, type OcrResult } from "@/lib/services/ocr-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeviceCaptureProps {
  onContinue: (draft: DeviceDraft) => void;
  onCancel: () => void;
}

export function DeviceCapture({ onContinue, onCancel }: DeviceCaptureProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [serial, setSerial] = useState("");
  const [result, setResult] = useState<OcrResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    void processFile(file);
  }

  async function processFile(file?: File) {
    if (!file) return;
    activeRequest.current?.abort();
    const request = new AbortController();
    activeRequest.current = request;
    setError(null);
    setPhoto(null);
    setResult(null);
    setSerial("");
    setIsProcessing(true);
    try {
      const dataUrl = await imageFileToDataUrl(file);
      if (request.signal.aborted) return;
      setPhoto(dataUrl);
      const ocr = await extractSerial(file, request.signal);
      if (request.signal.aborted) return;
      setResult(ocr);
      setSerial(ocr.serialNumber);
    } catch (caught) {
      if (request.signal.aborted) return;
      setError(
        caught instanceof Error
          ? caught.message
          : "The image could not be processed.",
      );
      setResult(null);
      setSerial("");
    } finally {
      if (activeRequest.current === request) {
        activeRequest.current = null;
        setIsProcessing(false);
      }
    }
  }

  function reset() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setIsProcessing(false);
    setPhoto(null);
    setSerial("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-[var(--primary)]">
          Evidence capture
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          Capture a device serial
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Photograph the serial label or upload an existing image. You can
          verify and edit the extracted value before saving the record.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>
                {photo ? "Captured evidence" : "Add an image"}
              </CardTitle>
              <CardDescription>
                Review the device label before continuing to registration.
              </CardDescription>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Camera size={18} />
            </div>
          </CardHeader>
          <CardContent>
            {photo ? (
              <div className="space-y-4">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border bg-black">
                  <Image
                    src={photo}
                    alt="Captured serial evidence"
                    width={1280}
                    height={800}
                    unoptimized
                    className="size-full object-contain"
                  />
                  {isProcessing ? (
                    <div className="absolute inset-0 grid place-items-center bg-black/55 text-white">
                      <div className="text-center">
                        <Loader2 className="mx-auto animate-spin" size={26} />
                        <p className="mt-2 text-sm font-semibold">
                          Reading serial number…
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => cameraInput.current?.click()}
                  >
                    <Camera size={16} /> Retake
                  </Button>
                  <Button variant="ghost" onClick={reset}>
                    <RefreshCw size={16} /> Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid min-h-80 place-items-center rounded-2xl border-2 border-dashed bg-[var(--surface-muted)] p-6 text-center">
                <div>
                  <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                    <ImageIcon size={26} />
                  </div>
                  <h2 className="mt-4 text-lg font-bold">
                    Photograph the serial label
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
                    Use a clear, well-lit image. Keep the serial number
                    horizontal and avoid glare where possible.
                  </p>
                  <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                    <Button
                      size="lg"
                      onClick={() => cameraInput.current?.click()}
                    >
                      <Camera size={18} /> Open camera
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={() => galleryInput.current?.click()}
                    >
                      <FileImage size={18} /> Choose image
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={galleryInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Serial review</CardTitle>
                <CardDescription>
                  Confirm the extracted text before continuing.
                </CardDescription>
              </div>
              <Sparkles className="text-[var(--primary)]" size={20} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="captured-serial">Serial number</Label>
                <Input
                  id="captured-serial"
                  value={serial}
                  onChange={(event) => setSerial(event.target.value)}
                  placeholder="Enter or confirm the serial number"
                  disabled={!photo || isProcessing}
                />
              </div>
              {isProcessing ? <p role="status" className="text-sm text-[var(--muted)]">Uploading image and reading serial number...</p> : null}
              {result?.status === "FOUND" ? (
                <div role="status" className="rounded-2xl border bg-[var(--success-soft)] p-4 text-sm text-[var(--success)]">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 size={17} /> Extraction complete
                  </div>
                  <p className="mt-1 text-xs opacity-90">
                    Check the serial number above and correct it if needed.
                  </p>
                </div>
              ) : (
                <div role="status" className="rounded-2xl border bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted)]">
                  {result?.status === "NOT_FOUND" ? "No serial number was found. Try another photo or enter it manually above." : "The extracted serial will appear here. You can also enter it manually after selecting a photo."}
                </div>
              )}
              {error ? (
                <p
                  role="alert"
                  className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]"
                >
                  {error}
                </p>
              ) : null}
              <Button
                size="lg"
                className="w-full"
                disabled={!photo || isProcessing || !serial.trim()}
                onClick={() => onContinue({ serial: serial.trim(), photo })}
              >
                Continue to device details
              </Button>
              <Button variant="ghost" className="w-full" onClick={onCancel}>
                Cancel
              </Button>
            </CardContent>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-bold">
                  Review before continuing
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Check the serial against the device label. Your photo and
                  reviewed serial will be carried into the device details form.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

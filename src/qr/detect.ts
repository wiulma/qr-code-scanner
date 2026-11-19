import { decodeQR } from "./decode";

// Native: the browser does all the work
const createNativeDetect = (): Detect => {
  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  return async (video) => {
    const codes = await detector.detect(video);
    return codes[0]?.rawValue ?? null;
  };
};

// Ours: copy the frame into a canvas and decode the pixels ourselves
const createJsDetect = (): Detect => {
  const canvas = document.createElement("canvas"); // never added to the page
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  return async (video) => {
    const image = grabFrame(video, canvas, ctx);
    return decodeQR(image);
  };
};

export async function createDetect(): Promise<Detect> {
  const forceJs = new URLSearchParams(location.search).get("decoder") === "js";
  if (!forceJs && "BarcodeDetector" in window) {
    const formats = await BarcodeDetector.getSupportedFormats();
    if (formats.includes("qr_code")) return createNativeDetect();
  }
  return createJsDetect();
}

const MAX_SIZE = 640;

function grabFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): ImageData {
  // Downscale: 1080p is ~2M pixels; we don't need that many and it's slow
  const scale = Math.min(1, MAX_SIZE / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);

  // Resizing a canvas clears it and is costly, so only do it when needed
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

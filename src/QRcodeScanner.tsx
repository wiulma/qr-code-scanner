import { useEffect, useEffectEvent, useRef, useState } from "react";
import "./scanner.css";

type Props = {
  onCode: (code: string) => void;
};

export const QRcodeScanner = ({ onCode }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  const onDetected = useEffectEvent((code: string) => onCode(code));

  useEffect(() => {
    console.log("effect start");
    let stream: MediaStream | null = null;
    let cancelled = false;
    let timeoutId = 0;
    const detector = new BarcodeDetector({ formats: ["qr_code"] });

    const scan = async () => {
      const video = videoRef.current;
      if (!video || cancelled) return;
      if (video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            onDetected(codes[0].rawValue);
            return;
          }
        } catch (e) {
          console.error("detect failed", e);
        }
      }
      if (!cancelled) timeoutId = setTimeout(scan, 200);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        return video.play();
      })
      .then(scan)
      .catch((e) => setError(e.message));

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section className="scanner-container">
      <div className="qr-scanner">
        <video muted playsInline ref={videoRef} />
      </div>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
};

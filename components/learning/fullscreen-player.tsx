"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Minimize } from "lucide-react";
import styles from "./fullscreen-player.module.css";

export function FullscreenPlayer({ children }: { children: ReactNode }) {
  const player = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const fullscreen = nativeFullscreen || expanded;

  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === player.current;
      setNativeFullscreen(active);
      if (!document.fullscreenElement) button.current?.focus({ preventScroll: true });
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        button.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  async function toggleFullscreen() {
    if (pending || !player.current) return;
    setError("");
    if (expanded) { setExpanded(false); return; }
    setPending(true);
    try {
      if (document.fullscreenElement === player.current) {
        await document.exitFullscreen();
      } else if (player.current.requestFullscreen && document.fullscreenEnabled) {
        try { await player.current.requestFullscreen(); }
        catch { setExpanded(true); }
      } else {
        // Browsers without element fullscreen still get a viewport-sized player.
        setExpanded(true);
      }
    } catch {
      setError("Không thể thu nhỏ video. Bạn có thể nhấn Esc để thoát toàn màn hình.");
    } finally { setPending(false); }
  }

  return <div ref={player} className={styles.player} data-expanded={expanded}>
    <div className={styles.toolbar}>
      {error && <span role="alert" className={styles.error}>{error}</span>}
      <button ref={button} type="button" className={styles.toggle} onClick={toggleFullscreen} disabled={pending} aria-pressed={fullscreen} aria-label={fullscreen ? "Thu nhỏ video" : "Phóng to toàn màn hình"} title={fullscreen ? "Thu nhỏ video (Esc)" : "Phóng to toàn màn hình"}>
        {fullscreen ? <Minimize size={22} aria-hidden="true" /> : <Maximize size={22} aria-hidden="true" />}
      </button>
    </div>
    {children}
  </div>;
}

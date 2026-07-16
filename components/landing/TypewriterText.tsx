"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  text: string;
  className?: string;
  speed?: number;
  startDelay?: number;
}

export function TypewriterText({
  text,
  className,
  speed = 50,
  startDelay = 300,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let index = 0;
    let charTimer: ReturnType<typeof setTimeout> | undefined;

    const startTimer = setTimeout(() => {
      const typeNext = () => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index < text.length) {
          charTimer = setTimeout(typeNext, speed);
        } else {
          setDone(true);
        }
      };
      typeNext();
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      if (charTimer) clearTimeout(charTimer);
    };
  }, [text, speed, startDelay]);

  return (
    <span className={cn("inline", className)} aria-label={text}>
      <span aria-hidden="true">{displayed}</span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block w-0.5 h-[0.85em] ml-1 align-middle bg-white",
          done ? "opacity-0" : "animate-pulse",
        )}
      />
    </span>
  );
}

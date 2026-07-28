import { useEffect, useState } from "react";
import CountUp from "react-countup";

type Props = {
  total: number;
  /** Data is loaded; the catalogue count can start counting up. */
  ready: boolean;
  onFinish: () => void;
};

export default function WelcomeSplash({ total, ready, onFinish }: Props) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!fading) return;
    const t = window.setTimeout(onFinish, 700);
    return () => window.clearTimeout(t);
  }, [fading, onFinish]);

  // Data arrived but count is unusable — don't strand the user on the splash.
  useEffect(() => {
    if (ready && total <= 0) setFading(true);
  }, [ready, total]);

  const showCount = ready && total > 0;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-background
        transition-opacity duration-700 ease-out ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <span
        className="text-7xl md:text-8xl leading-none text-white animate-[fadeIn_1.4s_ease-in-out]"
        style={{ fontFamily: "International", WebkitFontSmoothing: "antialiased" }}
      >
        Cinelas
      </span>
      <div className="min-h-16 text-center">
        {showCount && (
          <div className="animate-[fadeIn_0.5s_ease-in-out]">
            <span className="tabular-nums text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">
              <CountUp
                end={total}
                duration={2.5}
                separator=","
                onEnd={() => window.setTimeout(() => setFading(true), 500)}
              />
            </span>
            <p className="mt-2 text-sm text-white/50">
              movies &amp; TV shows to discover
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

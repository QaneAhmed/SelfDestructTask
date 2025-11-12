let confettiPromise: Promise<typeof import("canvas-confetti")> | null = null;

async function getConfetti() {
  if (!confettiPromise) {
    confettiPromise = import("canvas-confetti");
  }
  return confettiPromise;
}

type ConfettiLevel = "low" | "medium" | "high";

const LEVEL_CONFIG: Record<ConfettiLevel, { duration: number; baseCount: number; velocity: number }> =
  {
    low: { duration: 600, baseCount: 80, velocity: 35 },
    medium: { duration: 900, baseCount: 140, velocity: 45 },
    high: { duration: 1300, baseCount: 220, velocity: 55 },
  };

export async function fireConfetti(level: ConfettiLevel = "medium") {
  if (typeof window === "undefined") {
    return;
  }

  const confetti = await getConfetti();
  const { duration, baseCount, velocity } = LEVEL_CONFIG[level];
  const animationEnd = Date.now() + duration;

  const defaults = {
    startVelocity: velocity,
    spread: 60,
    ticks: 120,
    zIndex: 1000,
  };

  const frame = () => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return;
    }

    const particleCount = Math.max(12, Math.round(baseCount * (timeLeft / duration)));

    confetti.default({
      ...defaults,
      origin: { x: 0.1, y: 0.7 },
      particleCount: Math.round(particleCount * 0.6),
      angle: 60,
    });

    confetti.default({
      ...defaults,
      origin: { x: 0.9, y: 0.7 },
      particleCount: Math.round(particleCount * 0.8),
      angle: 120,
    });

    requestAnimationFrame(frame);
  };

  frame();
}

let confettiPromise: Promise<typeof import("canvas-confetti")> | null = null;

async function getConfetti() {
  if (!confettiPromise) {
    confettiPromise = import("canvas-confetti");
  }
  return confettiPromise;
}

export async function fireConfetti() {
  if (typeof window === "undefined") {
    return;
  }

  const confetti = await getConfetti();
  const duration = 1000;
  const animationEnd = Date.now() + duration;

  const defaults = {
    startVelocity: 45,
    spread: 55,
    ticks: 90,
    zIndex: 1000,
  };

  const frame = () => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return;
    }

    const particleCount = Math.round(200 * (timeLeft / duration));

    confetti.default({
      ...defaults,
      origin: { x: 0, y: 0.5 },
      particleCount,
      angle: 60,
    });

    confetti.default({
      ...defaults,
      origin: { x: 1, y: 0.5 },
      particleCount,
      angle: 120,
    });

    requestAnimationFrame(frame);
  };

  frame();
}

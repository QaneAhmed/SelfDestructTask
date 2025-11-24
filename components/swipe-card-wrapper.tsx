"use client";

import { motion, useAnimation } from "framer-motion";
import { PropsWithChildren } from "react";

interface SwipeCardWrapperProps extends PropsWithChildren {
  onComplete?: () => void;
  onDelete?: () => void;
}

export function SwipeCardWrapper({ children, onComplete, onDelete }: SwipeCardWrapperProps) {
  const controls = useAnimation();

  const handleDragEnd = async (_: any, info: { offset: { x: number } }) => {
    if (info.offset.x > 120) {
      await controls.start({ x: 320, opacity: 0 });
      onComplete?.();
      controls.set({ x: 0, opacity: 1 });
    } else if (info.offset.x < -120) {
      await controls.start({ x: -320, opacity: 0 });
      onDelete?.();
      controls.set({ x: 0, opacity: 1 });
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      animate={controls}
      className="touch-pan-y"
    >
      {children}
    </motion.div>
  );
}

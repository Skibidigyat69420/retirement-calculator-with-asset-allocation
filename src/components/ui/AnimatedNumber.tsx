import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

export interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smoothly tweens numeric values to their next formatted state. */
export const AnimatedNumber = ({ value, format, className }: AnimatedNumberProps) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const mv = useMotionValue(safeValue);
  const text = useTransform(mv, (latest) =>
    format ? format(latest) : Math.round(latest).toLocaleString(),
  );

  useEffect(() => {
    if (prefersReducedMotion()) {
      mv.set(safeValue);
      return;
    }
    const controls = animate(mv, safeValue, {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [safeValue, mv]);

  return <motion.span className={className}>{text}</motion.span>;
};

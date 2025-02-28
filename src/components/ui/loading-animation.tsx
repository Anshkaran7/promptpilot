import React from "react";
import { motion } from "framer-motion";

interface LoadingAnimationProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

export const LoadingAnimation = ({
  size = "md",
  color = "text-blue-500 dark:text-blue-400",
}: LoadingAnimationProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const circleVariants = {
    initial: { opacity: 0, y: 0 },
    animate: (i: number) => ({
      opacity: [0.2, 1, 0.2],
      y: [0, -4, 0],
      transition: {
        duration: 1,
        repeat: Infinity,
        delay: i * 0.2,
      },
    }),
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`rounded-full ${sizeClasses[size]} ${color}`}
          variants={circleVariants}
          initial="initial"
          animate="animate"
          custom={i}
        />
      ))}
    </div>
  );
};

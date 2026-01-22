"use client"

import { AnimatePresence, motion, type Transition, type Variants } from "framer-motion"
import { usePathname } from "next/navigation"
import { type ReactNode } from "react"

interface MotionProviderProps {
  children: ReactNode
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -8,
  },
}

const pageTransition: Transition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.2,
}

export function MotionProvider({ children }: MotionProviderProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

"use client"

import React, {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type PanInfo,
} from "framer-motion"
import { Check, Loader2, SendHorizontal, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, ButtonProps } from "@/components/ui/button"

const DRAG_CONSTRAINTS = { left: 0, right: 155 }
const DRAG_THRESHOLD = 0.9

const BUTTON_STATES = {
  initial: { width: "16rem" },
  completed: { width: "10rem" },
}

const ANIMATION_CONFIG = {
  spring: {
    type: "spring",
    stiffness: 400,
    damping: 40,
    mass: 0.8,
  },
}

type StatusIconProps = {
  status: string
}

const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  const iconMap: Record<StatusIconProps["status"], JSX.Element> = useMemo(
    () => ({
      loading: <Loader2 className="animate-spin text-white" size={20} />,
      success: <Check className="text-white" size={20} />,
      error: <X className="text-white" size={20} />,
    }),
    []
  )

  if (!iconMap[status]) return null

  return (
    <motion.div
      key={crypto.randomUUID()}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
    >
      {iconMap[status]}
    </motion.div>
  )
}

const useButtonStatus = (
  resolveTo: "success" | "error",
  onAction?: () => void
) => {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")

  const handleSubmit = useCallback(() => {
    setStatus("loading")
    setTimeout(() => {
      setStatus(resolveTo)
      if (onAction && resolveTo === "success") {
        onAction()
      }
    }, 1500)
  }, [resolveTo, onAction])

  return { status, handleSubmit }
}

export interface SlideButtonProps extends Omit<ButtonProps, "onAction"> {
  onAction?: () => void
  texto?: string
}

export const SlideButton = forwardRef<HTMLButtonElement, SlideButtonProps>(
  ({ className, onAction, texto = "DESLIZA PARA CONFIRMAR", ...props }, ref) => {
    const [isDragging, setIsDragging] = useState(false)
    const [completed, setCompleted] = useState(false)
    const dragHandleRef = useRef<HTMLDivElement | null>(null)
    const { status, handleSubmit } = useButtonStatus("success", onAction)

    const dragX = useMotionValue(0)
    const springX = useSpring(dragX, ANIMATION_CONFIG.spring)
    const dragProgress = useTransform(
      springX,
      [0, DRAG_CONSTRAINTS.right],
      [0, 1]
    )

    const handleDragStart = useCallback(() => {
      if (completed) return
      setIsDragging(true)
    }, [completed])

    const handleDragEnd = () => {
      if (completed) return
      setIsDragging(false)

      const progress = dragProgress.get()
      if (progress >= DRAG_THRESHOLD) {
        setCompleted(true)
        handleSubmit()
      } else {
        dragX.set(0)
      }
    }

    const handleDrag = (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: PanInfo
    ) => {
      if (completed) return
      const newX = Math.max(0, Math.min(info.offset.x, DRAG_CONSTRAINTS.right))
      dragX.set(newX)
    }

    const adjustedWidth = useTransform(springX, (x) => x + 10)

    // Agregamos opacidad al texto base a medida que se desliza
    const textOpacity = useTransform(springX, [0, DRAG_CONSTRAINTS.right * 0.8], [1, 0])

    return (
      <motion.div
        animate={completed ? BUTTON_STATES.completed : BUTTON_STATES.initial}
        transition={ANIMATION_CONFIG.spring}
        className={cn(
          "relative flex h-14 items-center justify-center rounded-full bg-slate-800 border border-slate-700/50 shadow-inner overflow-hidden",
          className
        )}
      >
        {!completed && (
          <>
            <motion.div
              style={{
                width: adjustedWidth,
              }}
              className="absolute inset-y-0 left-0 z-0 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
            />
            <motion.span 
              style={{ opacity: textOpacity }}
              className="absolute z-10 text-xs font-bold tracking-widest text-slate-400 pointer-events-none pl-12"
            >
              {texto}
            </motion.span>
          </>
        )}
        <AnimatePresence key="drag-handle">
          {!completed && (
            <motion.div
              ref={dragHandleRef}
              drag="x"
              dragConstraints={DRAG_CONSTRAINTS}
              dragElastic={0.05}
              dragMomentum={false}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrag={handleDrag}
              style={{ x: springX }}
              className="absolute left-1 z-20 flex cursor-grab items-center justify-start active:cursor-grabbing"
            >
              <Button
                ref={ref}
                disabled={status === "loading"}
                type="button"
                {...props}
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg drop-shadow-xl",
                  isDragging && "scale-105 transition-transform"
                )}
              >
                <SendHorizontal className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence key="completed-state">
          {completed && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                ref={ref}
                disabled={status === "loading"}
                type="button"
                {...props}
                className="h-full w-full rounded-full bg-emerald-500 text-white transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.6)]"
              >
                <AnimatePresence key="status-icon" mode="wait">
                  <StatusIcon status={status} />
                </AnimatePresence>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }
)

SlideButton.displayName = "SlideButton"

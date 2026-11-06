"use client"

import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import { useGSAP } from "@gsap/react"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)
  gsap.defaults({ ease: "power3.out", duration: 0.9 })
}

/** Media queries every landing section branches on. */
export const MOTION = "(prefers-reduced-motion: no-preference)"
export const MOTION_DESKTOP = "(prefers-reduced-motion: no-preference) and (min-width: 1024px)"
export const MOTION_MOBILE = "(prefers-reduced-motion: no-preference) and (max-width: 1023px)"

export { gsap, ScrollTrigger, SplitText, useGSAP }

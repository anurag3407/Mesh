import React from "react"
import { StyleSheet, View, type ViewProps } from "react-native"

interface GlassCardProps extends ViewProps {
  children: React.ReactNode
  variant?: "default" | "active" | "danger" | "terminal"
}

export function GlassCard({ children, style, variant = "default", ...props }: GlassCardProps) {
  return (
    <View style={[styles.card, styles[variant], style]} {...props}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#111814",
    borderWidth: 1,
    borderColor: "#1e2922",
  },
  default: {},
  active: {
    borderColor: "#10b981",
    backgroundColor: "#0d2017",
  },
  danger: {
    borderColor: "#ef4444",
    backgroundColor: "#2b1111",
  },
  terminal: {
    borderColor: "#334155",
    backgroundColor: "#030712",
  },
})

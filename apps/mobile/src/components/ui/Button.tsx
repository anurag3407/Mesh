import React from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native"

interface ButtonProps extends TouchableOpacityProps {
  title: string
  variant?: "primary" | "secondary" | "danger" | "ghost"
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  title,
  variant = "primary",
  loading = false,
  icon,
  style,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "secondary" ? "#f8fafc" : "#ffffff"}
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  primary: {
    backgroundColor: "#10b981",
  },
  secondary: {
    backgroundColor: "#1e293b",
  },
  danger: {
    backgroundColor: "#ef4444",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
  },
  primaryText: {
    color: "#ffffff",
  },
  secondaryText: {
    color: "#f8fafc",
  },
  dangerText: {
    color: "#ffffff",
  },
  ghostText: {
    color: "#94a3b8",
  },
})

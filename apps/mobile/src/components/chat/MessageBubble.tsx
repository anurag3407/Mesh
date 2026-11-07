import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { Bot, User, Sparkles } from "lucide-react-native"
import type { Message } from "../../types"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = message.senderType === "agent"
  const isSystem = message.senderType === "system"

  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    )
  }

  const senderTag = isAgent
    ? message.senderHandle
      ? `@${message.senderHandle}`
      : "Agent"
    : message.senderName || "You"

  return (
    <View style={[styles.container, isAgent ? styles.agentRow : styles.humanRow]}>
      <View style={[styles.avatar, isAgent ? styles.agentAvatar : styles.humanAvatar]}>
        {isAgent ? <Bot size={15} color="#10b981" /> : <User size={15} color="#60a5fa" />}
      </View>

      <View style={[styles.bubble, isAgent ? styles.agentBubble : styles.humanBubble]}>
        <View style={styles.headerRow}>
          <Text style={[styles.senderName, isAgent ? styles.agentName : styles.humanName]}>
            {senderTag}
          </Text>
          {message.status === "streaming" && (
            <View style={styles.streamingIndicator}>
              <Sparkles size={11} color="#10b981" />
              <Text style={styles.streamingText}>Streaming</Text>
            </View>
          )}
        </View>

        <Text style={styles.content}>
          {message.content}
          {message.status === "streaming" && <Text style={styles.cursor}> ▋</Text>}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  agentRow: {
    alignSelf: "flex-start",
  },
  humanRow: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  agentAvatar: {
    backgroundColor: "#0d261b",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  humanAvatar: {
    backgroundColor: "#172554",
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  bubble: {
    maxWidth: "84%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  agentBubble: {
    backgroundColor: "#101713",
    borderWidth: 1,
    borderColor: "#1d2922",
  },
  humanBubble: {
    backgroundColor: "#1e3a8a",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "700",
  },
  agentName: {
    color: "#34d399",
  },
  humanName: {
    color: "#93c5fd",
  },
  streamingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streamingText: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "600",
  },
  content: {
    color: "#f8fafc",
    fontSize: 15,
    lineHeight: 22,
  },
  cursor: {
    color: "#10b981",
    fontWeight: "900",
  },
  systemContainer: {
    alignSelf: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginVertical: 8,
  },
  systemText: {
    color: "#94a3b8",
    fontSize: 12,
    fontStyle: "italic",
  },
})

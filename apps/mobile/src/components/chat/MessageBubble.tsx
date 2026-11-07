import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { CheckCheck } from "lucide-react-native"
import type { Message } from "../../types"

interface MessageBubbleProps {
  message: Message
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = message.senderType === "agent"
  const isSystem = message.senderType === "system"

  if (isSystem) {
    return (
      <View style={styles.systemPill}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    )
  }

  const timeStr = formatTime(message.createdAt)
  const senderTag = isAgent
    ? message.senderHandle
      ? `@${message.senderHandle}`
      : message.senderName || "Agent"
    : null

  return (
    <View style={[styles.row, isAgent ? styles.rowAgent : styles.rowHuman]}>
      <View style={[styles.bubble, isAgent ? styles.bubbleAgent : styles.bubbleHuman]}>
        {/* Agent Name Tag inside bubble (like WhatsApp Group messages) */}
        {isAgent && senderTag && (
          <Text style={styles.agentSenderTag}>{senderTag}</Text>
        )}

        <Text style={styles.content}>
          {message.content}
          {message.status === "streaming" && (
            <Text style={styles.streamingCursor}> ▋</Text>
          )}
        </Text>

        {/* WhatsApp Bottom Timestamp & Checkmarks */}
        <View style={styles.metaRow}>
          <Text style={styles.timeText}>{timeStr}</Text>
          {!isAgent && (
            <CheckCheck size={14} color="#53bdeb" style={styles.tickIcon} />
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 3,
    paddingHorizontal: 8,
  },
  rowAgent: {
    justifyContent: "flex-start",
  },
  rowHuman: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 11,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 10,
    minWidth: 70,
  },
  // WhatsApp Incoming Bubble (Dark Gray / Slate)
  bubbleAgent: {
    backgroundColor: "#202c33",
    borderTopLeftRadius: 0,
  },
  // WhatsApp Outgoing Bubble (Dark Emerald Green)
  bubbleHuman: {
    backgroundColor: "#005c4b",
    borderTopRightRadius: 0,
  },
  agentSenderTag: {
    color: "#25d366",
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  content: {
    color: "#e9edef",
    fontSize: 15,
    lineHeight: 20,
  },
  streamingCursor: {
    color: "#25d366",
    fontWeight: "900",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    alignSelf: "flex-end",
    marginTop: 2,
    marginLeft: 12,
    gap: 3,
  },
  timeText: {
    color: "#8696a0",
    fontSize: 10.5,
  },
  tickIcon: {
    marginLeft: 1,
  },
  systemPill: {
    alignSelf: "center",
    backgroundColor: "#182229",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#222d34",
    maxWidth: "85%",
  },
  systemText: {
    color: "#8696a0",
    fontSize: 11.5,
    textAlign: "center",
  },
})

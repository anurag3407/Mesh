import React, { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { Send, Smile, Paperclip, Mic } from "lucide-react-native"

interface ChatInputProps {
  onSend: (text: string) => Promise<void>
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)

  const handlePressSend = async () => {
    if (!text.trim() || sending || disabled) return
    const content = text
    setText("")
    setSending(true)
    try {
      await onSend(content)
    } finally {
      setSending(false)
    }
  }

  const hasContent = Boolean(text.trim())

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.container}>
        {/* WhatsApp Capsule Input Box */}
        <View style={styles.capsule}>
          <TouchableOpacity style={styles.iconBtn}>
            <Smile size={22} color="#8696a0" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor="#8696a0"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={10_000}
          />

          <TouchableOpacity style={styles.iconBtn}>
            <Paperclip size={20} color="#8696a0" />
          </TouchableOpacity>
        </View>

        {/* WhatsApp Detached Green Circle Action Button */}
        <TouchableOpacity
          style={styles.actionCircle}
          onPress={hasContent ? handlePressSend : undefined}
          disabled={disabled || sending}
          activeOpacity={0.8}
        >
          {hasContent ? (
            <Send size={18} color="#ffffff" style={styles.sendIcon} />
          ) : (
            <Mic size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: "transparent",
    gap: 6,
  },
  capsule: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#202c33",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 46,
    maxHeight: 120,
  },
  iconBtn: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#e9edef",
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 6,
    maxHeight: 110,
  },
  actionCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#00a884",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  sendIcon: {
    marginLeft: 2,
  },
})

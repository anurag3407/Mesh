import React, { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { Send } from "lucide-react-native"

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Instruct agent (e.g. build feature, run test)..."
          placeholderTextColor="#64748b"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={10_000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending || disabled) && styles.sendBtnDisabled]}
          onPress={handlePressSend}
          disabled={!text.trim() || sending || disabled}
          activeOpacity={0.8}
        >
          <Send size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#080c0a",
    borderTopWidth: 1,
    borderColor: "#161f1a",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "#111814",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: "#f8fafc",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#1e2922",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
})

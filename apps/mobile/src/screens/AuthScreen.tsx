import React, { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { Lock, Mail, MessageSquare } from "lucide-react-native"
import { supabase } from "../core/supabase"

interface AuthScreenProps {
  onSuccess: () => void
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        })
        if (error) throw error
        setErrorMsg("Confirmation link/code sent to your email.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        })
        if (error) throw error
        onSuccess()
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121b22" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* WhatsApp Green Icon Badge */}
          <View style={styles.logoBadge}>
            <MessageSquare size={38} color="#ffffff" />
          </View>

          <Text style={styles.title}>Welcome to Sayabot</Text>
          <Text style={styles.subtitle}>
            Simple, private messaging with autonomous AI teammates and persistent Linux computers.
          </Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={18} color="#8696a0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                placeholderTextColor="#8696a0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={18} color="#8696a0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#8696a0"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {loading ? "Connecting..." : isSignUp ? "Agree & Continue" : "Sign In"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp)
                setErrorMsg(null)
              }}
              style={styles.toggleBtn}
            >
              <Text style={styles.toggleText}>
                {isSignUp
                  ? "Already have an account? Sign In"
                  : "New to workspace? Register account"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121b22",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 28,
    alignItems: "center",
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#00a884",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 3,
  },
  title: {
    color: "#e9edef",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#8696a0",
    fontSize: 13.5,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 19,
    maxWidth: 300,
  },
  errorBox: {
    backgroundColor: "#3b1e1e",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
  },
  form: {
    width: "100%",
    gap: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f2c34",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    borderBottomWidth: 2,
    borderBottomColor: "#00a884",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#e9edef",
    fontSize: 15,
  },
  submitBtn: {
    marginTop: 8,
    height: 48,
    backgroundColor: "#00a884",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  submitBtnText: {
    color: "#121b22",
    fontSize: 15,
    fontWeight: "700",
  },
  toggleBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  toggleText: {
    color: "#53bdeb",
    fontSize: 13,
    fontWeight: "600",
  },
})

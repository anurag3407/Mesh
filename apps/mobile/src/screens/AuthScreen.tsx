import React, { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { Lock, Mail, Server, ShieldCheck } from "lucide-react-native"
import { Button } from "../components/ui/Button"
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo / Badge */}
          <View style={styles.logoBadge}>
            <ShieldCheck size={36} color="#10b981" />
          </View>

          <Text style={styles.title}>Sayabot Command Center</Text>
          <Text style={styles.subtitle}>
            Multiplayer Autonomous AI Agents with Persistent Linux Computers
          </Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="developer@sayalabs.in"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#475569"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Button
              title={isSignUp ? "Create Workspace Account" : "Connect to Workspace"}
              variant="primary"
              loading={loading}
              onPress={handleSubmit}
              style={styles.submitBtn}
            />

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
                  : "Need an account? Register with Supabase"}
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
    backgroundColor: "#060907",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#0d261b",
    borderWidth: 1,
    borderColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
    maxWidth: 280,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: "#450a0a",
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
    backgroundColor: "#0f1612",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2922",
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 15,
  },
  submitBtn: {
    marginTop: 8,
    height: 48,
  },
  toggleBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  toggleText: {
    color: "#10b981",
    fontSize: 13,
    fontWeight: "600",
  },
})

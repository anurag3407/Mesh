import React from "react"
import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { LogOut, Server, Shield, User, Key } from "lucide-react-native"
import { useAuth } from "../hooks/useAuth"
import { ENV } from "../config/env"

export function SettingsScreen() {
  const { user, signOut } = useAuth()

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to disconnect from this workspace?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2c34" />
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.content}>
        {/* User Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <User size={22} color="#00a884" />
              </View>
              <View style={styles.textColumn}>
                <Text style={styles.cardMain}>{user?.email || "Signed In User"}</Text>
                <Text style={styles.cardSub}>Account active • Verified via Supabase</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Server Endpoint Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Infrastructure</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Server size={18} color="#53bdeb" />
              <View style={styles.textColumn}>
                <Text style={styles.cardMain}>VPS Host Gateway</Text>
                <Text style={styles.cardSub}>{ENV.WEB_API_URL}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.card, { marginTop: 8 }]}>
            <View style={styles.row}>
              <Shield size={18} color="#a855f7" />
              <View style={styles.textColumn}>
                <Text style={styles.cardMain}>Database & Realtime</Text>
                <Text style={styles.cardSub}>{ENV.SUPABASE_URL}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* BYOK Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Providers</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Key size={18} color="#eab308" />
              <View style={styles.textColumn}>
                <Text style={styles.cardMain}>BYOK Keys (OpenRouter, OpenAI, Claude)</Text>
                <Text style={styles.cardSub}>AES-256-GCM encrypted in workspace vault</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <LogOut size={16} color="#f87171" />
            <Text style={styles.logoutText}>Log Out from Workspace</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121b22" },
  header: {
    backgroundColor: "#1f2c34",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: "#e9edef", fontSize: 20, fontWeight: "700" },
  content: { padding: 16, gap: 16 },
  section: { gap: 6 },
  sectionTitle: {
    color: "#8696a0",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#1f2c34",
    borderRadius: 10,
    padding: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#202c33",
    alignItems: "center",
    justifyContent: "center",
  },
  textColumn: { flex: 1 },
  cardMain: { color: "#e9edef", fontSize: 15, fontWeight: "600" },
  cardSub: { color: "#8696a0", fontSize: 12, marginTop: 2 },
  logoutContainer: { marginTop: 12 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#1f2c34",
    gap: 8,
    borderWidth: 1,
    borderColor: "#3b1e1e",
  },
  logoutText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "700",
  },
})

import React from "react"
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { LogOut, Server, Shield, User, Key } from "lucide-react-native"
import { useAuth } from "../hooks/useAuth"
import { ENV } from "../config/env"
import { Button } from "../components/ui/Button"

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
      <View style={styles.header}>
        <Text style={styles.title}>Workspace Settings</Text>
      </View>

      <View style={styles.content}>
        {/* User Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <User size={18} color="#10b981" />
              <View>
                <Text style={styles.cardMain}>{user?.email || "Signed In User"}</Text>
                <Text style={styles.cardSub}>ID: {user?.id?.slice(0, 12)}...</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Server Endpoint Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backend Infrastructure</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Server size={18} color="#60a5fa" />
              <View>
                <Text style={styles.cardMain}>VPS Host Gateway</Text>
                <Text style={styles.cardSub}>{ENV.WEB_API_URL}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.card, { marginTop: 8 }]}>
            <View style={styles.row}>
              <Shield size={18} color="#a855f7" />
              <View>
                <Text style={styles.cardMain}>Database & Realtime</Text>
                <Text style={styles.cardSub}>{ENV.SUPABASE_URL}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* BYOK Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Providers (BYOK)</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Key size={18} color="#eab308" />
              <View>
                <Text style={styles.cardMain}>Encrypted Provider Keys</Text>
                <Text style={styles.cardSub}>
                  Managed securely in Settings → Providers on desktop web
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Disconnect & Sign Out"
            variant="danger"
            icon={<LogOut size={16} color="#fff" />}
            onPress={handleSignOut}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060907" },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#161f1a",
  },
  title: { color: "#f8fafc", fontSize: 20, fontWeight: "800" },
  content: { padding: 18, gap: 20 },
  section: { gap: 8 },
  sectionTitle: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#111814",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e2922",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardMain: { color: "#f8fafc", fontSize: 15, fontWeight: "600" },
  cardSub: { color: "#64748b", fontSize: 12, marginTop: 2 },
  logoutContainer: { marginTop: 20 },
})

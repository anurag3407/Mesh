import React, { useEffect, useState } from "react"
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { Cpu, HardDrive, RefreshCw, Server, Power, Globe } from "lucide-react-native"
import { supabase } from "../core/supabase"
import { ENV } from "../config/env"
import type { ComputerContainerState } from "../types"

export function ComputersScreen() {
  const [computers, setComputers] = useState<ComputerContainerState[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComputers = async () => {
    setLoading(true)
    try {
      const { data: agentRows } = await supabase
        .from("agents")
        .select("id, handle, display_name, capabilities")
        .limit(30)

      if (agentRows) {
        const list: ComputerContainerState[] = agentRows
          .filter((a: any) => a.capabilities?.computer)
          .map((a: any) => ({
            agentId: a.id,
            agentHandle: a.handle,
            status: "running",
            containerId: `bot-${a.id.slice(0, 8)}`,
            ip: "172.28.0.3",
            profile: a.capabilities?.computer?.profile || "standard",
          }))
        setComputers(list)
      }
    } catch (e) {
      console.error("[ComputersScreen] error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComputers()
  }, [])

  const handleTogglePower = async (item: ComputerContainerState) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${ENV.WEB_API_URL}/api/v1/computers/${item.agentId}/stop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })
      fetchComputers()
    } catch (err) {
      console.error("Stop failed:", err)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2c34" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Agent Computers</Text>
          <Text style={styles.subtitle}>Persistent Linux Docker Micro-Environments</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchComputers}>
          <RefreshCw size={18} color="#aebac1" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={computers}
        keyExtractor={(item) => item.agentId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchComputers} tintColor="#00a884" />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.agentInfo}>
                <Cpu size={20} color="#00a884" />
                <View>
                  <Text style={styles.handle}>@{item.agentHandle}</Text>
                  <Text style={styles.containerName}>ID: {item.containerId}</Text>
                </View>
              </View>

              <View style={[styles.statusBadge, item.status === "running" ? styles.bgRunning : styles.bgStopped]}>
                <Text style={[styles.statusText, item.status === "running" ? styles.textRunning : styles.textStopped]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <HardDrive size={13} color="#8696a0" />
                <Text style={styles.detailText}>Mount: /home/bot (Persistent)</Text>
              </View>
              <View style={styles.detailItem}>
                <Globe size={13} color="#8696a0" />
                <Text style={styles.detailText}>Profile: {item.profile} (Chromium + Bash)</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.ipText}>IP: {item.ip || "172.28.0.3 (botnet)"}</Text>
              <TouchableOpacity style={styles.powerBtn} onPress={() => handleTogglePower(item)}>
                <Power size={13} color="#f43f5e" />
                <Text style={styles.powerBtnText}>Sleep / Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Server size={36} color="#8696a0" />
              <Text style={styles.emptyText}>No active agent computers deployed.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121b22" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1f2c34",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: "#e9edef", fontSize: 19, fontWeight: "700" },
  subtitle: { color: "#00a884", fontSize: 12, fontWeight: "600", marginTop: 2 },
  refreshBtn: { padding: 6 },
  list: { padding: 12 },
  card: {
    backgroundColor: "#1f2c34",
    borderRadius: 12,
    padding: 14,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: "#2a3942",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  agentInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  handle: { color: "#e9edef", fontSize: 16, fontWeight: "700" },
  containerName: { color: "#8696a0", fontSize: 11, fontFamily: "monospace" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  bgRunning: { backgroundColor: "#064e3b" },
  bgStopped: { backgroundColor: "#3b1e1e" },
  statusText: { fontSize: 10, fontWeight: "700" },
  textRunning: { color: "#25d366" },
  textStopped: { color: "#f87171" },
  detailsGrid: {
    gap: 6,
    backgroundColor: "#121b22",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { color: "#8696a0", fontSize: 12 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#2a3942",
  },
  ipText: { color: "#8696a0", fontSize: 11, fontFamily: "monospace" },
  powerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#3b1e1e",
  },
  powerBtnText: { color: "#f87171", fontSize: 11, fontWeight: "700" },
  empty: { padding: 40, alignItems: "center", gap: 12 },
  emptyText: { color: "#8696a0", fontSize: 14 },
})

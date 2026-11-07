import React, { useEffect, useState } from "react"
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
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
      // Fetch agents that have computer capability enabled
      const { data: agentRows } = await supabase
        .from("agents")
        .select("id, handle, display_name, capabilities")
        .limit(30)

      if (agentRows) {
        // Query orchestrator internal state or simulate container view
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
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Agent Computers</Text>
          <Text style={styles.subtitle}>Persistent Linux Docker Micro-Environments</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchComputers}>
          <RefreshCw size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={computers}
        keyExtractor={(item) => item.agentId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchComputers} tintColor="#10b981" />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.agentInfo}>
                <Cpu size={20} color="#10b981" />
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
                <HardDrive size={13} color="#64748b" />
                <Text style={styles.detailText}>Mount: /home/bot (Persistent)</Text>
              </View>
              <View style={styles.detailItem}>
                <Globe size={13} color="#64748b" />
                <Text style={styles.detailText}>Profile: {item.profile} (Chromium + Bash)</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.ipText}>IP: {item.ip || "127.0.0.1 (botnet)"}</Text>
              <TouchableOpacity style={styles.powerBtn} onPress={() => handleTogglePower(item)}>
                <Power size={14} color="#f43f5e" />
                <Text style={styles.powerBtnText}>Sleep / Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Server size={36} color="#334155" />
              <Text style={styles.emptyText}>No active agent computers deployed.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060907" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#161f1a",
  },
  title: { color: "#f8fafc", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#10b981", fontSize: 12, fontWeight: "600", marginTop: 2 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111814",
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 14 },
  card: {
    backgroundColor: "#111814",
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#1e2922",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  agentInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  handle: { color: "#f8fafc", fontSize: 16, fontWeight: "700" },
  containerName: { color: "#64748b", fontSize: 11, fontFamily: "monospace" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  bgRunning: { backgroundColor: "#064e3b" },
  bgStopped: { backgroundColor: "#450a0a" },
  statusText: { fontSize: 10, fontWeight: "700" },
  textRunning: { color: "#34d399" },
  textStopped: { color: "#f87171" },
  detailsGrid: {
    gap: 6,
    backgroundColor: "#0a0f0c",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { color: "#94a3b8", fontSize: 12 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#161f1a",
  },
  ipText: { color: "#64748b", fontSize: 11, fontFamily: "monospace" },
  powerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#2b1111",
  },
  powerBtnText: { color: "#f87171", fontSize: 11, fontWeight: "700" },
  empty: { padding: 40, alignItems: "center", gap: 12 },
  emptyText: { color: "#64748b", fontSize: 14 },
})

import React, { useState } from "react"
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { CheckSquare, Filter, RefreshCw, Zap } from "lucide-react-native"
import { useTasks } from "../hooks/useTasks"
import { TaskCard } from "../components/tasks/TaskCard"
import type { TaskItem } from "../types"

export function TasksScreen() {
  const { tasks, loading, refresh } = useTasks()
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "blocked" | "done">("all")

  const filtered = tasks.filter((t) => {
    if (filter === "all") return true
    if (filter === "blocked") return t.status === "blocked" || t.status === "stuck"
    return t.status === filter
  })

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Autonomous Task Board</Text>
          <Text style={styles.subtitle}>24/7 Background Agent Work Queue</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <RefreshCw size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {(["all", "in_progress", "blocked", "done"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filter === tab && styles.tabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
              {tab.replace("_", " ").toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskCard task={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#10b981" />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <CheckSquare size={36} color="#334155" />
              <Text style={styles.emptyText}>No tasks found in this view.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060907",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#161f1a",
  },
  title: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111814",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: "#0f1612",
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#111814",
    borderWidth: 1,
    borderColor: "#1e2922",
  },
  tabActive: {
    backgroundColor: "#064e3b",
    borderColor: "#10b981",
  },
  tabText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#34d399",
  },
  listContent: {
    padding: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
})

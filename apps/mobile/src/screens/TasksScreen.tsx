import React, { useState } from "react"
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
import { CheckSquare, RefreshCw } from "lucide-react-native"
import { useTasks } from "../hooks/useTasks"
import { TaskCard } from "../components/tasks/TaskCard"

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
      <StatusBar barStyle="light-content" backgroundColor="#1f2c34" />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Autonomous Tasks</Text>
          <Text style={styles.subtitle}>24/7 Background Agent Work Queue</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <RefreshCw size={18} color="#aebac1" />
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
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#00a884" />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <CheckSquare size={36} color="#8696a0" />
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
    backgroundColor: "#121b22",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1f2c34",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: "#e9edef",
    fontSize: 19,
    fontWeight: "700",
  },
  subtitle: {
    color: "#00a884",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  refreshBtn: {
    padding: 6,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#1f2c34",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: "#2a3942",
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#202c33",
  },
  tabActive: {
    backgroundColor: "#00a884",
  },
  tabText: {
    color: "#8696a0",
    fontSize: 11,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#121b22",
  },
  listContent: {
    padding: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#8696a0",
    fontSize: 14,
  },
})

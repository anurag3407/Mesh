import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { CheckCircle2, Clock, AlertCircle, Bot } from "lucide-react-native"
import type { TaskItem } from "../../types"

interface TaskCardProps {
  task: TaskItem
}

export function TaskCard({ task }: TaskCardProps) {
  const isDone = task.status === "done"
  const isBlocked = task.status === "blocked" || task.status === "stuck"
  const isInProgress = task.status === "in_progress"

  const statusColor = isDone
    ? "#10b981"
    : isBlocked
      ? "#ef4444"
      : isInProgress
        ? "#3b82f6"
        : "#94a3b8"

  return (
    <View style={[styles.card, { borderLeftColor: statusColor }]}>
      <View style={styles.header}>
        <View style={styles.numberRow}>
          <Text style={styles.taskNumber}>#{task.number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{task.status}</Text>
          </View>
        </View>

        {task.assigneeHandle && (
          <View style={styles.assigneeBadge}>
            <Bot size={13} color="#10b981" />
            <Text style={styles.assigneeText}>@{task.assigneeHandle}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{task.title}</Text>

      {task.description && (
        <Text style={styles.description} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      {task.unblockNeeds && (
        <View style={styles.blockerAlert}>
          <AlertCircle size={14} color="#f87171" />
          <Text style={styles.blockerText}>Needs: {task.unblockNeeds}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.turnCounter}>
          <Clock size={12} color="#64748b" />
          <Text style={styles.turnsText}>
            {task.turnsUsed} / {task.budgetTurns} turns
          </Text>
        </View>
        {task.costUsd > 0 && (
          <Text style={styles.costText}>${task.costUsd.toFixed(4)}</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111814",
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#1e2922",
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskNumber: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  assigneeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0d261b",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  assigneeText: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  description: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  blockerAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#450a0a",
    padding: 8,
    borderRadius: 8,
    marginVertical: 6,
  },
  blockerText: {
    color: "#fca5a5",
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: "#161f1a",
  },
  turnCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  turnsText: {
    color: "#64748b",
    fontSize: 11,
  },
  costText: {
    color: "#10b981",
    fontSize: 11,
    fontWeight: "700",
  },
})

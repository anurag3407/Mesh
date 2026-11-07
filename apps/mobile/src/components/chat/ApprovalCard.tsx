import React from "react"
import { Platform, StyleSheet, Text, View } from "react-native"
import { AlertTriangle, Check, X } from "lucide-react-native"
import { Button } from "../ui/Button"
import type { PendingApproval } from "../../types"

interface ApprovalCardProps {
  approval: PendingApproval
  onResolve: (approved: boolean) => void
}

export function ApprovalCard({ approval, onResolve }: ApprovalCardProps) {
  const formattedArgs = JSON.stringify(approval.args, null, 2)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AlertTriangle size={18} color="#eab308" />
        <Text style={styles.title}>Tool Approval Requested</Text>
      </View>

      <Text style={styles.body}>
        Agent requests permission to execute{" "}
        <Text style={styles.toolName}>{approval.toolName}</Text>:
      </Text>

      <View style={styles.codeBox}>
        <Text style={styles.codeText}>{formattedArgs}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Approve"
          variant="primary"
          icon={<Check size={16} color="#fff" />}
          style={styles.actionBtn}
          onPress={() => onResolve(true)}
        />
        <Button
          title="Reject"
          variant="danger"
          icon={<X size={16} color="#fff" />}
          style={styles.actionBtn}
          onPress={() => onResolve(false)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    padding: 14,
    backgroundColor: "#1c1404",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#854d0e",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  title: {
    color: "#fef08a",
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    color: "#e2e8f0",
    fontSize: 13,
    marginBottom: 8,
  },
  toolName: {
    color: "#38bdf8",
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  codeBox: {
    backgroundColor: "#050505",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 12,
  },
  codeText: {
    color: "#4ade80",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
  },
})

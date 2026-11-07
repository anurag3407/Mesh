import React from "react"
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { Terminal, Trash2, X } from "lucide-react-native"

interface TerminalDrawerProps {
  visible: boolean
  logs: string[]
  onClose: () => void
  onClear: () => void
}

export function TerminalDrawer({ visible, logs, onClose, onClear }: TerminalDrawerProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Terminal size={18} color="#22c55e" />
              <Text style={styles.title}>Agent Computer Terminal (/home/bot)</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.iconBtn} onPress={onClear}>
                <Trash2 size={16} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                <X size={18} color="#f43f5e" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Console Output */}
          <ScrollView style={styles.terminalBody}>
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>
                $ Waiting for agent computer shell executions...
              </Text>
            ) : (
              logs.map((chunk, index) => (
                <Text key={index} style={styles.logText}>
                  {chunk}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  container: {
    height: "65%",
    backgroundColor: "#030712",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#1f2937",
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  terminalBody: {
    flex: 1,
    marginTop: 8,
  },
  emptyText: {
    color: "#475569",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    marginTop: 20,
    textAlign: "center",
  },
  logText: {
    color: "#4ade80",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
})

import React, { useRef, useState } from "react"
import {
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { ArrowLeft, Terminal, ShieldAlert } from "lucide-react-native"
import { useRoomRealtime } from "../hooks/useRoomRealtime"
import { MessageBubble } from "../components/chat/MessageBubble"
import { TerminalDrawer } from "../components/chat/TerminalDrawer"
import { ApprovalCard } from "../components/chat/ApprovalCard"
import { ChatInput } from "../components/chat/ChatInput"
import { StatusPill } from "../components/ui/StatusPill"

export function ChatScreen({ route, navigation }: any) {
  const { roomId, roomName, orgSlug } = route.params
  const {
    messages,
    loading,
    agentStatus,
    terminalLogs,
    approval,
    sendMessage,
    resolveApproval,
    clearTerminal,
  } = useRoomRealtime(roomId, orgSlug)

  const [terminalVisible, setTerminalVisible] = useState(false)
  const listRef = useRef<FlatList>(null)

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <View style={styles.leftRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color="#f8fafc" />
          </TouchableOpacity>
          <View>
            <Text style={styles.roomName}>#{roomName}</Text>
            {agentStatus ? (
              <StatusPill label={agentStatus} active />
            ) : (
              <Text style={styles.idleText}>Ready for instructions</Text>
            )}
          </View>
        </View>

        {/* Live Terminal Drawer Toggle */}
        <TouchableOpacity
          style={[styles.terminalBtn, terminalLogs.length > 0 && styles.terminalActive]}
          onPress={() => setTerminalVisible(true)}
          activeOpacity={0.8}
        >
          <Terminal size={16} color={terminalLogs.length > 0 ? "#10b981" : "#94a3b8"} />
          <Text style={styles.terminalBtnText}>Logs ({terminalLogs.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Tool Human Approval Banner */}
      {approval && (
        <ApprovalCard approval={approval} onResolve={resolveApproval} />
      )}

      {/* Messages Feed */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.messageFeed}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Welcome to #{roomName}</Text>
              <Text style={styles.emptySub}>
                Send a message or task to wake the room agents. If configured, agents will spin up
                their persistent Linux computer (/home/bot) to inspect code, run tests, and publish
                deliverables.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Input Bar */}
      <ChatInput onSend={sendMessage} />

      {/* Real-time Computer Terminal Output Modal */}
      <TerminalDrawer
        visible={terminalVisible}
        logs={terminalLogs}
        onClose={() => setTerminalVisible(false)}
        onClear={clearTerminal}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#161f1a",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111814",
    alignItems: "center",
    justifyContent: "center",
  },
  roomName: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "800",
  },
  idleText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  terminalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#111814",
    borderWidth: 1,
    borderColor: "#1e2922",
  },
  terminalActive: {
    backgroundColor: "#064e3b",
    borderColor: "#10b981",
  },
  terminalBtnText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
  },
  messageFeed: {
    paddingVertical: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    marginTop: 40,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySub: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
})

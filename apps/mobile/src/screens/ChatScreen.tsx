import React, { useRef, useState } from "react"
import {
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { ArrowLeft, Terminal, MoreVertical, Bot } from "lucide-react-native"
import { useRoomRealtime } from "../hooks/useRoomRealtime"
import { MessageBubble } from "../components/chat/MessageBubble"
import { TerminalDrawer } from "../components/chat/TerminalDrawer"
import { ApprovalCard } from "../components/chat/ApprovalCard"
import { ChatInput } from "../components/chat/ChatInput"

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

  // Status subtitle: if agent is busy, show "typing..." or "running command...", else "online"
  const subtitle = agentStatus ? agentStatus.toLowerCase() : "online"

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2c34" />

      {/* WhatsApp Chat Room Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#e9edef" />
          </TouchableOpacity>

          {/* Contact Avatar */}
          <View style={styles.headerAvatar}>
            <Bot size={20} color="#00a884" />
          </View>

          {/* Contact Name & Subtitle */}
          <View style={styles.contactDetails}>
            <Text style={styles.contactName} numberOfLines={1}>
              #{roomName}
            </Text>
            <Text
              style={[
                styles.contactStatus,
                agentStatus ? styles.statusTyping : styles.statusOnline,
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        {/* Header Right Actions */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.terminalIconBtn, terminalLogs.length > 0 && styles.terminalActive]}
            onPress={() => setTerminalVisible(true)}
          >
            <Terminal size={19} color={terminalLogs.length > 0 ? "#00a884" : "#aebac1"} />
            {terminalLogs.length > 0 && <View style={styles.terminalBadge} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreBtn}>
            <MoreVertical size={20} color="#aebac1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* WhatsApp Wallpaper Container */}
      <View style={styles.wallpaper}>
        {/* Date Divider */}
        <View style={styles.datePill}>
          <Text style={styles.dateText}>TODAY</Text>
        </View>

        {/* Human In The Loop Danger Tool Approval Card */}
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
                <View style={styles.encryptionPill}>
                  <Text style={styles.encryptionText}>
                    🔒 Messages in this room coordinate autonomous agents with persistent Linux
                    computers. All credentials are encrypted with AES-256-GCM.
                  </Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* WhatsApp Bottom Input Bar */}
        <ChatInput onSend={sendMessage} />
      </View>

      {/* Slide-Up Terminal Drawer (Output from /home/bot) */}
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
    backgroundColor: "#1f2c34",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1f2c34",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#202c33",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#202c33",
    borderWidth: 1,
    borderColor: "#00a884",
    alignItems: "center",
    justifyContent: "center",
  },
  contactDetails: {
    flex: 1,
    justifyContent: "center",
  },
  contactName: {
    color: "#e9edef",
    fontSize: 16,
    fontWeight: "700",
  },
  contactStatus: {
    fontSize: 12,
    marginTop: 1,
  },
  statusOnline: {
    color: "#8696a0",
  },
  statusTyping: {
    color: "#25d366",
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingRight: 4,
  },
  terminalIconBtn: {
    padding: 6,
    position: "relative",
  },
  terminalActive: {
    borderRadius: 6,
    backgroundColor: "#202c33",
  },
  terminalBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#00a884",
  },
  moreBtn: {
    padding: 4,
  },
  wallpaper: {
    flex: 1,
    backgroundColor: "#0b141a",
  },
  datePill: {
    alignSelf: "center",
    backgroundColor: "#182229",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#222d34",
  },
  dateText: {
    color: "#8696a0",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  messageFeed: {
    paddingVertical: 6,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    marginTop: 20,
  },
  encryptionPill: {
    backgroundColor: "#182229",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222d34",
    maxWidth: "90%",
  },
  encryptionText: {
    color: "#ffd279",
    fontSize: 11.5,
    textAlign: "center",
    lineHeight: 17,
  },
})

import React, { useState } from "react"
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import {
  Camera,
  Search,
  MoreVertical,
  MessageSquare,
  Bot,
  Hash,
  CheckCheck,
} from "lucide-react-native"
import { useRooms } from "../hooks/useRooms"
import type { Room } from "../types"

export function RoomsScreen({ navigation }: any) {
  const { rooms, orgSlug, loading, refresh } = useRooms()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"chats" | "tasks" | "computers">("chats")

  const filtered = rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))

  const renderRoom = ({ item, index }: { item: Room; index: number }) => {
    const isDm = item.kind === "dm"
    // Distinct avatar accent colors for agents like WhatsApp group avatars
    const avatarColors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"]
    const color = avatarColors[index % avatarColors.length]

    return (
      <TouchableOpacity
        style={styles.chatRow}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("Chat", {
            roomId: item.id,
            roomName: item.name,
            orgSlug,
          })
        }
      >
        {/* Contact / Agent Circular Avatar */}
        <View style={[styles.avatar, { backgroundColor: `${color}20`, borderColor: color }]}>
          {isDm ? <Bot size={22} color={color} /> : <Hash size={22} color={color} />}
        </View>

        {/* Center Content */}
        <View style={styles.chatDetails}>
          <View style={styles.topRow}>
            <Text style={styles.contactName} numberOfLines={1}>
              {isDm ? `@${item.name}` : item.name}
            </Text>
            <Text style={styles.timeText}>10:42 AM</Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.snippetRow}>
              <CheckCheck size={15} color="#53bdeb" style={styles.checkIcon} />
              <Text style={styles.snippetText} numberOfLines={1}>
                {item.systemDirective || "Tap to chat with autonomous agents..."}
              </Text>
            </View>

            {item.turnMode === "debate" && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>DEBATE</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2c34" />

      {/* WhatsApp Top Header Bar */}
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>Sayabot</Text>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.topActionBtn}>
            <Camera size={20} color="#aebac1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topActionBtn} onPress={() => setSearchOpen(!searchOpen)}>
            <Search size={20} color="#aebac1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topActionBtn}
            onPress={() => navigation.navigate("SettingsTab")}
          >
            <MoreVertical size={20} color="#aebac1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Optional Search Bar */}
      {searchOpen && (
        <View style={styles.searchBar}>
          <Search size={16} color="#8696a0" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search agents or rooms..."
            placeholderTextColor="#8696a0"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      )}

      {/* WhatsApp Horizontal Sub-Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "chats" && styles.tabItemActive]}
          onPress={() => setActiveTab("chats")}
        >
          <Text style={[styles.tabTitle, activeTab === "chats" && styles.tabTitleActive]}>
            CHATS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "tasks" && styles.tabItemActive]}
          onPress={() => navigation.navigate("TasksTab")}
        >
          <Text style={[styles.tabTitle, activeTab === "tasks" && styles.tabTitleActive]}>
            TASKS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "computers" && styles.tabItemActive]}
          onPress={() => navigation.navigate("ComputersTab")}
        >
          <Text style={[styles.tabTitle, activeTab === "computers" && styles.tabTitleActive]}>
            COMPUTERS
          </Text>
        </TouchableOpacity>
      </View>

      {/* WhatsApp Chat List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#00a884" />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* WhatsApp Green Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("TasksTab")}
      >
        <MessageSquare size={22} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121b22",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1f2c34",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  appTitle: {
    color: "#e9edef",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  topActionBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f2c34",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "#2a3942",
  },
  searchInput: {
    flex: 1,
    color: "#e9edef",
    fontSize: 15,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1f2c34",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#00a884",
  },
  tabTitle: {
    color: "#8696a0",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tabTitleActive: {
    color: "#00a884",
  },
  listContent: {
    paddingBottom: 80,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
  },
  chatDetails: {
    flex: 1,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  contactName: {
    color: "#e9edef",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  timeText: {
    color: "#8696a0",
    fontSize: 11.5,
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  snippetRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  checkIcon: {
    marginRight: 1,
  },
  snippetText: {
    color: "#8696a0",
    fontSize: 13.5,
    flex: 1,
  },
  badge: {
    backgroundColor: "#202c33",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  badgeText: {
    color: "#00a884",
    fontSize: 10,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: "#1f2c34",
    marginLeft: 78,
  },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 22,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#00a884",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
})

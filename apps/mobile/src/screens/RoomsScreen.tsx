import React, { useState } from "react"
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { Hash, MessageSquare, Bot, Search, RefreshCw, Terminal } from "lucide-react-native"
import { useRooms } from "../hooks/useRooms"
import type { Room } from "../types"

export function RoomsScreen({ navigation }: any) {
  const { rooms, orgSlug, loading, refresh } = useRooms()
  const [search, setSearch] = useState("")

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const renderRoom = ({ item }: { item: Room }) => {
    const isDm = item.kind === "dm"

    return (
      <TouchableOpacity
        style={styles.roomItem}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("Chat", {
            roomId: item.id,
            roomName: item.name,
            orgSlug,
          })
        }
      >
        <View style={[styles.iconCircle, isDm ? styles.dmCircle : styles.channelCircle]}>
          {isDm ? (
            <Bot size={18} color="#10b981" />
          ) : (
            <Hash size={18} color="#60a5fa" />
          )}
        </View>

        <View style={styles.roomInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.roomName}>{item.name}</Text>
            <View style={styles.turnModeBadge}>
              <Text style={styles.turnModeText}>{item.turnMode}</Text>
            </View>
          </View>
          {item.systemDirective ? (
            <Text style={styles.directive} numberOfLines={1}>
              {item.systemDirective}
            </Text>
          ) : (
            <Text style={styles.metaText}>{item.kind} workspace room</Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sayabot Rooms</Text>
          <Text style={styles.headerSub}>Workspace: #{orgSlug}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <RefreshCw size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter rooms or direct agent chats..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Room List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#10b981" />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No rooms found.</Text>
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
  headerTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
  },
  headerSub: {
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1612",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e2922",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
  roomItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#0f1612",
    gap: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  channelCircle: {
    backgroundColor: "#172554",
  },
  dmCircle: {
    backgroundColor: "#064e3b",
  },
  roomInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  roomName: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
  turnModeBadge: {
    backgroundColor: "#111814",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1e2922",
  },
  turnModeText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  directive: {
    color: "#64748b",
    fontSize: 12,
  },
  metaText: {
    color: "#475569",
    fontSize: 12,
    textTransform: "capitalize",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
})

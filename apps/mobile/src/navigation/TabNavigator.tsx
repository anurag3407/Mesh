import React from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { MessageSquare, CheckSquare, Cpu, Settings } from "lucide-react-native"
import { RoomsScreen } from "../screens/RoomsScreen"
import { TasksScreen } from "../screens/TasksScreen"
import { ComputersScreen } from "../screens/ComputersScreen"
import { SettingsScreen } from "../screens/SettingsScreen"

const Tab = createBottomTabNavigator()

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1f2c34",
          borderTopColor: "#2a3942",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#00a884",
        tabBarInactiveTintColor: "#8696a0",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="RoomsTab"
        component={RoomsScreen}
        options={{
          tabBarLabel: "Chats",
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TasksScreen}
        options={{
          tabBarLabel: "Tasks",
          tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ComputersTab"
        component={ComputersScreen}
        options={{
          tabBarLabel: "Computers",
          tabBarIcon: ({ color, size }) => <Cpu size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}

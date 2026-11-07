import React from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useAuth } from "../hooks/useAuth"
import { AuthScreen } from "../screens/AuthScreen"
import { TabNavigator } from "./TabNavigator"
import { ChatScreen } from "../screens/ChatScreen"
import { ActivityIndicator, View } from "react-native"

const Stack = createNativeStackNavigator()

export function RootNavigator() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#060907", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#060907" } }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthScreenWrapper} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ animation: "slide_from_right" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

function AuthScreenWrapper() {
  return <AuthScreen onSuccess={() => {}} />
}

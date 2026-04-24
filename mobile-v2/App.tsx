import "./global.css";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import DailyGoalHeader from "./src/components/DailyGoalHeader";

import "@core/infra/expoGps"; // 👈 registra o TaskManager.defineTask no load

import Home from "./src/screens/Home";
import Historico from "./src/screens/Historico";
import Abastecer from "./src/screens/Abastecer";
import Configuracoes from "./src/screens/Configuracoes";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

const ACCENT = "#10B981"; // Trevvos

const Tab = createBottomTabNavigator();
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "white" },
};

function Tabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => <DailyGoalHeader routeName={route.name} />,
        sceneStyle: { backgroundColor: "#F8FAFC" },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          borderTopColor: "#E2E8F0",
          height: 64 + insets.bottom,
          paddingBottom: Math.max(10, insets.bottom),
          paddingTop: 8,
          backgroundColor: "#FFFFFF",
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelPosition: "below-icon",
        tabBarLabel: ({ color, children, focused }) => (
          <Text
            style={{
              color,
              fontSize: 11,
              fontWeight: focused ? "700" : "500",
              marginTop: 2,
            }}
          >
            {children}
          </Text>
        ),
        tabBarIcon: ({ color, size, focused }) => {
          const map: Record<
            string,
            {
              filled: keyof typeof Ionicons.glyphMap;
              outline: keyof typeof Ionicons.glyphMap;
            }
          > = {
            Home: { filled: "speedometer", outline: "speedometer" },
            Histórico: { filled: "calendar", outline: "calendar-outline" },
            Abastecer: { filled: "flame", outline: "flame-outline" },
            Config: { filled: "settings", outline: "settings-outline" },
          };
          const entry = map[route.name] || {
            filled: "ellipse",
            outline: "ellipse-outline",
          };
          const name = focused ? entry.filled : entry.outline;
          return (
            <View
              style={{
                width: 36,
                height: 28,
                borderRadius: 12,
                backgroundColor: focused ? "#ECFDF5" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={name}
                size={focused ? size + 1 : size}
                color={focused ? ACCENT : color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Histórico" component={Historico} />
      <Tab.Screen name="Abastecer" component={Abastecer} />
      <Tab.Screen name="Config" component={Configuracoes} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" translucent />
      <NavigationContainer theme={theme}>
        <Tabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

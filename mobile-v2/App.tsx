import "./global.css";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import DailyGoalHeader from "./src/components/DailyGoalHeader";

import Home from "./src/screens/Home";
import Historico from "./src/screens/Historico";
import Abastecer from "./src/screens/Abastecer";
import Configuracoes from "./src/screens/Configuracoes";
import { Ionicons } from "@expo/vector-icons";

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
        header: () => <DailyGoalHeader />,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#6b7280",
        // 👇 dá respiro real no Android com gesture bar
        tabBarStyle: {
          borderTopColor: "#e5e7eb",
          height: 56 + insets.bottom, // + espaço seguro
          paddingBottom: Math.max(10, insets.bottom),
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: "speedometer",
            Histórico: "calendar-outline",
            Abastecer: "flame-outline",
            Config: "settings-outline",
          };
          return (
            <Ionicons
              name={map[route.name] || "ellipse-outline"}
              size={size}
              color={color}
            />
          );
        },
        // deixa o label padrão (evita layout quebrado)
        tabBarLabelStyle: { fontSize: 12 },
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

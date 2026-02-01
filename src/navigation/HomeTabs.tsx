import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import OutingsScreen from "../screens/OutingsScreen";
import ChatListScreen from "../screens/ChatListScreen";
import PeopleScreen from "../screens/PeopleScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import DevToolsScreen from "../screens/DevToolsScreen";
import { colors, layout, shadows } from "../theme";
import { haptics } from "../utils/haptics";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../types/navigation";
import { db } from "../firebaseApp";

type HomeTabParamList = {
  Discover: undefined;
  Vibe: undefined;
  CreateOuting: undefined;
  Chat: undefined;
  Notifications: undefined;
  DevTools: undefined;
};

const Tab = createBottomTabNavigator<HomeTabParamList>();

type StackNav = StackNavigationProp<RootStackParamList>;

const CreateButton = ({ onPress }: { onPress?: () => void }) => {
  const handlePress = () => {
    haptics.medium();
    onPress?.();
  };
  return (
    <View style={styles.createButtonWrap}>
      <View style={styles.createButtonHalo} />
      <TouchableOpacity style={styles.createButton} onPress={handlePress} activeOpacity={0.9}>
        <Text style={styles.createButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const TabTile = ({
  focused,
  label,
  icon,
}: {
  focused: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}) => (
  <View style={styles.tabTile}>
    <Ionicons
      name={icon}
      size={20}
      color={focused ? colors.textPrimary : colors.textSubtle}
    />
  </View>
);

const NotificationBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
};

const HomeTabs = () => {
  const { profile, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.id, "notifications"),
      where("read", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface1,
          borderTopColor: colors.transparent,
          height: 72,
          paddingTop: layout.compact,
          paddingBottom: layout.section,
          ...shadows.floating,
        },
        tabBarItemStyle: { paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={OutingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabTile focused={focused} label="Discover" icon="compass" />
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="Vibe"
        component={PeopleScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabTile focused={focused} label="Vibe" icon="flash" />
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="CreateOuting"
        component={OutingsScreen}
        options={({ navigation }) => ({
          tabBarLabel: () => null,
          tabBarButton: (props) => {
            const handlePress = () => {
              const parentNav = navigation.getParent();
              if (parentNav) {
                parentNav.dispatch(
                  CommonActions.navigate({
                    name: "CreateOuting",
                  })
                );
              }
            };
            return <CreateButton onPress={handlePress} />;
          },
        })}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const parentNav = navigation.getParent();
            if (parentNav) {
              parentNav.dispatch(
                CommonActions.navigate({
                  name: "CreateOuting",
                })
              );
            }
          },
        })}
      />
      <Tab.Screen
        name="Chat"
        component={ChatListScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabTile focused={focused} label="Chat" icon="chatbubble" />
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TabTile focused={focused} label="Alerts" icon="notifications" />
              <NotificationBadge count={unreadCount} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      {__DEV__ ? (
        <Tab.Screen
          name="DevTools"
          component={DevToolsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabTile focused={focused} label="Dev" icon="construct" />
            ),
            tabBarLabel: () => null,
          }}
        />
      ) : null}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  createButtonWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonHalo: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primarySoft,
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
  },
  createButtonText: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "700",
  },
  tabTile: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 68,
  },
  tabIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconActive: {
    backgroundColor: colors.primarySoft,
  },
  tabIconInactive: {
    backgroundColor: colors.surface2,
  },
  tabIconText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  tabLabel: {
    height: 0,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: {
    color: colors.bg,
    fontSize: 9,
    fontWeight: "700",
  },
});

export default HomeTabs;

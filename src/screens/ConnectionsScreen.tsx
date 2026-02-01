import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import { colors, layout, radius, typography } from "../theme";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { RootStackParamList } from "../types/navigation";

type Nav = StackNavigationProp<RootStackParamList, "Connections">;

type ConnectionItem = {
  id: string;
  otherUid: string;
  sinceAt?: any;
  sourceChatId?: string;
  profile?: any;
};

const ConnectionsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const snap = await getDocs(collection(db, "users", user.id, "connections"));
        const base: ConnectionItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        const withProfiles = await Promise.all(
          base.map(async (item) => {
            try {
              const profSnap = await getDoc(doc(db, "users", item.otherUid));
              return {
                ...item,
                profile: profSnap.exists() ? profSnap.data() : null,
              };
            } catch {
              return item;
            }
          })
        );
        setItems(withProfiles);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <ScreenHeader title="Connections" />

      {loading ? (
        <View style={styles.loadingRow}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          title="No saved connections yet"
          subtitle="When both of you save a chat, it’ll show up here."
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const profile = item.profile;
            const name = profile?.name || "Unknown";
            const city = profile?.city || "";
            const avatar = profile?.profile_photo_url || null;
            return (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("Profile", {
                    userId: item.otherUid,
                    context: "people",
                  })
                }
              >
                <View style={styles.avatarWrap}>
                  {avatar ? (
                    <ImageBackground
                      source={{ uri: avatar }}
                      style={styles.avatar}
                      imageStyle={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{name[0]}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{name}</Text>
                  {city ? <Text style={styles.meta}>{city}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: layout.major,
  },
  loadingRow: {
    alignItems: "center",
    marginTop: layout.section,
  },
  loadingText: {
    color: colors.textSecondary,
    ...typography.body2,
  },
  list: {
    marginTop: layout.section,
    gap: layout.section,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.section,
    padding: layout.section,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface1,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: colors.surface2,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarImage: {
    borderRadius: 26,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  cardBody: {
    flex: 1,
    gap: layout.compact,
  },
  name: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  meta: {
    color: colors.textMuted,
    ...typography.micro,
  },
});

export default ConnectionsScreen;




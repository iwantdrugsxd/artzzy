import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View, TouchableOpacity, Alert, Pressable } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, tokens } from "../theme";
import Screen from "../components/Screen";
import { logger } from "../utils/logger";
import { useAuth } from "../context/AuthContext";
import { haptics } from "../utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = StackScreenProps<RootStackParamList, "AuthChoice">;

const AuthChoiceScreen: React.FC<Props> = ({ navigation }) => {
  const { signInWithGoogleIdToken } = useAuth();
  const isExpoGo = Constants.appOwnership === "expo";
  const hasWebClient = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  const hasIosClient = Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const googleEnabled = isExpoGo ? hasWebClient : hasWebClient && hasIosClient;

  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true,
    projectNameForProxy: "@vishnu0795/partizo",
  });

  const expoWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = isExpoGo
    ? expoWebClientId
    : process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    expoClientId: expoWebClientId,
    iosClientId: isExpoGo ? expoWebClientId : iosClientId,
    webClientId: expoWebClientId,
    redirectUri,
    useProxy: true,
  });

  useEffect(() => {
    logger.info("auth.google.config", {
      redirectUri,
      expoClientId: expoWebClientId,
      iosClientId,
      isExpoGo,
      requestUrl: request?.url,
    });
  }, [redirectUri, request?.url]);

  useEffect(() => {
    const handle = async () => {
      if (response) {
        logger.info("auth.google.response", {
          type: response.type,
          params: response.params,
          error: "error" in response ? response.error : undefined,
        });
      }
      if (response?.type === "success") {
        const idToken = response.params.id_token;
        if (!idToken) {
          Alert.alert("Google sign-in failed", "Missing ID token.");
          return;
        }
        try {
          await signInWithGoogleIdToken(idToken);
        } catch (error) {
          logger.error("auth.google.failed", { error });
          Alert.alert("Google sign-in failed", "Please try again.");
        }
      } else if (response?.type === "error") {
        Alert.alert("Google sign-in failed", "Please try again.");
      }
    };
    handle();
  }, [response, signInWithGoogleIdToken]);

  const handleGooglePress = async () => {
    try {
      const result = await promptAsync({ useProxy: true });
      logger.info("auth.google.prompt", { result });
    } catch (error) {
      logger.error("auth.google.prompt.failed", { error });
      Alert.alert("Google sign-in failed", "Please try again.");
    }
  };

  return (
    <Screen contentContainerStyle={styles.container} edges={[]}>
      {/* Hero gradient panel */}
      <View style={styles.heroPanel}>
        <View style={styles.heroGradient} />
        <View style={styles.heroContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow} />
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.logo}>PARTIZO</Text>
          <Text style={styles.subtitle}>Curated outings. Real people. Your vibe.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {googleEnabled ? (
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              styles.secondaryCta,
              pressed && styles.ctaPressed,
              !request && styles.ctaDisabled,
            ]}
            onPress={handleGooglePress}
            disabled={!request}
          >
            <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
            <Text style={styles.ctaText}>Continue with Google</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            styles.primaryCta,
            pressed && styles.ctaPressed,
          ]}
          onPress={() => {
            haptics.medium();
            logger.info("auth.signup.started");
            navigation.navigate("EmailSignup");
          }}
        >
          <Text style={styles.primaryCtaText}>Continue with Email</Text>
        </Pressable>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate("EmailLogin")}>
        <Text style={styles.link}>
          Already have an account? <Text style={styles.linkBold}>Login</Text>
        </Text>
      </TouchableOpacity>

      <Text style={styles.terms}>
        By continuing you agree to our{"\n"}Terms of Service and Privacy Policy
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base,
    justifyContent: "center",
    paddingHorizontal: layout.gutter,
  },
  heroPanel: {
    width: SCREEN_WIDTH - tokens.spacing.xl * 2,
    height: 280,
    borderRadius: tokens.radius.card,
    marginBottom: tokens.spacing.xxl,
    overflow: "hidden",
    position: "relative",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.colors.primary.solid,
    opacity: 0.15,
  },
  heroContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacing.xl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing.lg,
  },
  logoGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    backgroundColor: tokens.colors.primary.solid,
    shadowColor: tokens.colors.primary.solid,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
  },
  logoDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.primary.solid,
    zIndex: 1,
    ...tokens.shadows.card.hero,
  },
  logo: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h1,
    letterSpacing: 3,
    marginBottom: tokens.spacing.sm,
    fontWeight: "800",
  },
  subtitle: {
    color: tokens.colors.text.muted,
    textAlign: "center",
    ...tokens.typography.body,
    lineHeight: 22,
  },
  actions: {
    width: "100%",
    gap: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
  },
  ctaButton: {
    height: 56,
    borderRadius: tokens.radius.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xl,
  },
  primaryCta: {
    backgroundColor: tokens.colors.primary.solid,
    ...tokens.shadows.buttonGlow,
  },
  secondaryCta: {
    backgroundColor: tokens.colors.bg.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  ctaPressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.9,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
    fontWeight: "600",
  },
  primaryCtaText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    color: tokens.colors.text.muted,
    ...tokens.typography.caption,
    textAlign: "center",
  },
  linkBold: {
    color: tokens.colors.text.primary,
    fontWeight: "600",
  },
  terms: {
    marginTop: tokens.spacing.xl,
    color: tokens.colors.text.subtle,
    ...tokens.typography.micro,
    textAlign: "center",
    lineHeight: 16,
  },
});

export default AuthChoiceScreen;

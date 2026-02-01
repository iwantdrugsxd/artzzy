import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, tokens, typography } from "../theme";
import Screen from "../components/Screen";
import TextField from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { logger } from "../utils/logger";
import { haptics } from "../utils/haptics";
import Pill from "../components/Pill";

type Props = StackScreenProps<RootStackParamList, "EmailLogin">;

const EmailLoginScreen: React.FC<Props> = ({ navigation }) => {
  const { signInEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = async () => {
    if (loading) return;
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email || !email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Invalid email format";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    haptics.medium();
    logger.info("auth.login.started", { email: email.trim().toLowerCase() });
    setLoading(true);
    try {
      await signInEmail(email.trim().toLowerCase(), password);
      logger.info("auth.login.success", { email: email.trim().toLowerCase() });
      // Navigation is handled by AppNavigator once auth state updates.
    } catch (error) {
      logger.error("login.failed", { error });
      const code = (error as { code?: string })?.code;
      if (code === "auth/invalid-email") {
        setErrors({ email: "Enter a valid email address" });
      } else if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setErrors({ password: "Invalid email or password" });
      } else if (code === "auth/too-many-requests") {
        setErrors({ password: "Too many attempts. Try again in a bit." });
      } else {
        setErrors({ password: "Login failed. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.container} scroll={false} edges={[]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          <View style={styles.brandBlock}>
            <View style={styles.logoDot} />
            <Text style={styles.logo}>PARTIZO</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to continue.</Text>
          <View style={styles.form}>
            <TextField
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              editable={!loading}
            />
            {errors.email && (
              <View style={styles.errorChip}>
                <Pill label={errors.email} style={styles.errorPill} />
              </View>
            )}
            <TextField
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              placeholder="Enter your password"
              secureTextEntry
              error={errors.password}
              editable={!loading}
            />
            {errors.password && (
              <View style={styles.errorChip}>
                <Pill label={errors.password} style={styles.errorPill} />
              </View>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
              loading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.loginButtonText}>Logging in...</Text>
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </Pressable>
          <TouchableOpacity onPress={() => navigation.navigate("EmailSignup")}>
            <Text style={styles.link}>
              New to Partizo? <Text style={styles.linkBold}>Create account</Text>
            </Text>
          </TouchableOpacity>
          <Text style={styles.terms}>Terms & Privacy</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: layout.section,
    paddingHorizontal: 0, // Screen component already adds padding
    paddingBottom: layout.major,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.compact,
    marginBottom: layout.major,
  },
  logoDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  logo: {
    color: colors.textPrimary,
    ...typography.caption,
    letterSpacing: 1.2,
  },
  title: {
    color: colors.textPrimary,
    ...typography.h2,
    marginBottom: layout.compact,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.body2,
    marginBottom: layout.major,
  },
  form: {
    marginBottom: layout.section,
  },
  errorChip: {
    marginTop: -layout.section + layout.compact,
    marginBottom: layout.compact,
    marginLeft: layout.compact,
  },
  errorPill: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  loginButton: {
    height: 56,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.colors.primary.solid,
    alignItems: "center",
    justifyContent: "center",
    ...tokens.shadows.buttonGlow,
  },
  loginButtonPressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.9,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    color: colors.textMuted,
    marginTop: layout.major,
    textAlign: "center",
    ...typography.body2,
  },
  linkBold: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  terms: {
    marginTop: layout.section,
    color: colors.textSubtle,
    ...typography.micro,
    textAlign: "center",
  },
});

export default EmailLoginScreen;

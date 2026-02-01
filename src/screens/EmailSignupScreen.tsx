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

type Props = StackScreenProps<RootStackParamList, "EmailSignup">;

const EmailSignupScreen: React.FC<Props> = ({ navigation }) => {
  const { signUpEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const [currentStep, setCurrentStep] = useState(1);

  const validateEmail = (value: string) => {
    if (!value || !value.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Invalid email format";
    return null;
  };

  const validatePassword = (value: string) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(value)) return "Password must contain uppercase and lowercase letters";
    return null;
  };

  const handleSignup = async () => {
    if (loading) return;
    const newErrors: { email?: string; password?: string; confirm?: string } = {};
    
    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;
    
    if (password !== confirm) {
      newErrors.confirm = "Passwords do not match";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    haptics.medium();
    logger.info("auth.signup.started", { email: email.trim().toLowerCase() });
    setLoading(true);
    try {
      await signUpEmail(email.trim().toLowerCase(), password);
      logger.info("auth.signup.success", { email: email.trim().toLowerCase() });
      // Navigation is handled by AppNavigator once auth state updates.
    } catch (error) {
      logger.error("signup.failed", { error });
      const code = (error as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        setErrors({ email: "This email is already registered" });
      } else if (code === "auth/invalid-email") {
        setErrors({ email: "Enter a valid email address" });
      } else if (code === "auth/weak-password") {
        setErrors({ password: "Password is too weak" });
      } else if (code === "auth/operation-not-allowed") {
        setErrors({ email: "Email sign-up is currently disabled" });
      } else {
        setErrors({ email: "Sign up failed. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  // Update step based on field completion
  React.useEffect(() => {
    if (email && !errors.email) setCurrentStep(2);
    if (password && !errors.password) setCurrentStep(3);
    if (confirm && password === confirm && !errors.confirm) setCurrentStep(4);
  }, [email, password, confirm, errors]);

  return (
    <Screen contentContainerStyle={styles.container} edges={[]} scroll={false}>
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
          
          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            {[1, 2, 3, 4].map((step) => (
              <View key={step} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    step <= currentStep && styles.stepDotActive,
                    step < currentStep && styles.stepDotCompleted,
                  ]}
                />
                {step < 4 && (
                  <View
                    style={[
                      styles.stepLine,
                      step < currentStep && styles.stepLineActive,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
          <Text style={styles.stepText}>Step {currentStep} of 4</Text>

          <Text style={styles.title}>Join the club</Text>
          <Text style={styles.subtitle}>Enter your details to start finding your vibe.</Text>
          
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
              helperText="We'll never share your email"
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
              placeholder="Create a password"
              secureTextEntry
              error={errors.password}
              helperText="At least 8 characters with uppercase and lowercase"
              editable={!loading}
            />
            {errors.password && (
              <View style={styles.errorChip}>
                <Pill label={errors.password} style={styles.errorPill} />
              </View>
            )}
            
            <TextField
              label="Confirm Password"
              value={confirm}
              onChangeText={(text) => {
                setConfirm(text);
                if (errors.confirm) setErrors({ ...errors, confirm: undefined });
              }}
              placeholder="Repeat password"
              secureTextEntry
              error={errors.confirm}
              helperText="Must match your password"
              editable={!loading}
            />
            {errors.confirm && (
              <View style={styles.errorChip}>
                <Pill label={errors.confirm} style={styles.errorPill} />
              </View>
            )}
          </View>
          
          <Pressable
            style={({ pressed }) => [
              styles.signupButton,
              pressed && styles.signupButtonPressed,
              loading && styles.signupButtonDisabled,
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.signupButtonText}>Creating account...</Text>
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </Pressable>
          
          <TouchableOpacity onPress={() => navigation.navigate("EmailLogin")}>
            <Text style={styles.link}>
              Already have an account? <Text style={styles.linkBold}>Log in</Text>
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
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: layout.compact,
    paddingHorizontal: layout.gutter,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface2,
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  stepDotCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: layout.compact,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepText: {
    color: colors.textMuted,
    ...typography.micro,
    textAlign: "center",
    marginBottom: layout.major,
    fontWeight: "600",
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
    lineHeight: 20,
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
  signupButton: {
    height: 56,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.colors.primary.solid,
    alignItems: "center",
    justifyContent: "center",
    ...tokens.shadows.buttonGlow,
  },
  signupButtonPressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.9,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
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

export default EmailSignupScreen;

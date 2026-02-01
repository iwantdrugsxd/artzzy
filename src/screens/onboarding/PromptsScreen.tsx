import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/navigation";
import { colors, layout, typography, radius } from "../../theme";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import TextField from "../../components/TextField";
import OnboardingHeader from "../../components/OnboardingHeader";
import InlineError from "../../components/InlineError";
import { promptGroups, Prompt } from "../../data/prompts";
import { useAuth } from "../../context/AuthContext";
import { ProfilePrompt } from "../../types/profile";
import { logger } from "../../utils/logger";

type Props = StackScreenProps<RootStackParamList, "Prompts">;

// Helper to count words in a string
const countWords = (text: string): number => {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const MIN_WORDS = 10;
const MAX_CHARACTERS = 200;

const PromptsScreen: React.FC<Props> = ({ navigation }) => {
  const { draft, updateDraft } = useAuth();
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [tempAnswer, setTempAnswer] = useState("");

  React.useEffect(() => {
    logger.info("onboarding.step.viewed", { step: "Prompts", stepId: 5 });
  }, []);

  const selectedPrompts = draft.prompts || [];

  const togglePrompt = (prompt: Prompt) => {
    const exists = selectedPrompts.some((p) => p.id === prompt.id);
    let next: ProfilePrompt[];
    if (exists) {
      next = selectedPrompts.filter((p) => p.id !== prompt.id);
    } else {
      if (selectedPrompts.length >= 3) {
        return; // Max 3
      }
      next = [
        ...selectedPrompts,
        { id: prompt.id, category: prompt.category, question: prompt.question, answer: "" },
      ];
    }
    updateDraft({ prompts: next });
  };

  const startEditing = (promptId: string) => {
    const prompt = selectedPrompts.find((p) => p.id === promptId);
    setEditingPromptId(promptId);
    setTempAnswer(prompt?.answer || "");
  };

  const saveAnswer = (promptId: string) => {
    const next = selectedPrompts.map((p) =>
      p.id === promptId ? { ...p, answer: tempAnswer.trim() } : p
    );
    updateDraft({ prompts: next });
    setEditingPromptId(null);
    setTempAnswer("");
  };

  const removePrompt = (promptId: string) => {
    const next = selectedPrompts.filter((p) => p.id !== promptId);
    updateDraft({ prompts: next });
    if (editingPromptId === promptId) {
      setEditingPromptId(null);
      setTempAnswer("");
    }
  };

  // Phase 1: Prompt reordering
  const movePrompt = (index: number, direction: "up" | "down") => {
    if (index === 0 && direction === "up") return;
    if (index === selectedPrompts.length - 1 && direction === "down") return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const next = [...selectedPrompts];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    updateDraft({ prompts: next });
  };

  const selectedCount = selectedPrompts.length;
  const answeredCount = selectedPrompts.filter((p) => countWords(p.answer) >= MIN_WORDS).length;
  const canContinue = selectedCount >= 2 && selectedCount <= 3 && answeredCount === selectedCount;

  const hasIncompleteAnswers = selectedPrompts.some(
    (p) => p.answer.length > 0 && countWords(p.answer) < MIN_WORDS
  );

  return (
    <Screen scroll={false} contentContainerStyle={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <OnboardingHeader
          step={5}
          total={8}
          title="Share your vibe"
          subtitle="Select 2-3 prompts and answer them (minimum 10 words each). This helps others get to know you better."
        />

        {/* Selected prompts with answers */}
        {selectedPrompts.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.sectionTitle}>Your Prompts</Text>
            <Text style={styles.reorderHint}>Drag to reorder (or use arrows)</Text>
            {selectedPrompts.map((prompt, index) => {
              const isEditing = editingPromptId === prompt.id;
              return (
                <View key={prompt.id} style={styles.promptCard}>
                  <View style={styles.promptHeader}>
                    {/* Phase 1: Reorder controls */}
                    <View style={styles.reorderControls}>
                      <Pressable
                        onPress={() => movePrompt(index, "up")}
                        disabled={index === 0}
                        style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                      >
                        <Ionicons name="chevron-up" size={16} color={index === 0 ? colors.textSubtle : colors.textSecondary} />
                      </Pressable>
                      <Pressable
                        onPress={() => movePrompt(index, "down")}
                        disabled={index === selectedPrompts.length - 1}
                        style={[styles.reorderButton, index === selectedPrompts.length - 1 && styles.reorderButtonDisabled]}
                      >
                        <Ionicons name="chevron-down" size={16} color={index === selectedPrompts.length - 1 ? colors.textSubtle : colors.textSecondary} />
                      </Pressable>
                    </View>
                    <Text style={styles.promptQuestion}>{prompt.question}</Text>
                    <Pressable
                      onPress={() => removePrompt(prompt.id)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeText}>×</Text>
                    </Pressable>
                  </View>
                  {isEditing ? (
                    <View style={styles.editSection}>
                      <TextField
                        value={tempAnswer}
                        onChangeText={setTempAnswer}
                        placeholder={`Write at least ${MIN_WORDS} words...`}
                        multiline
                        maxLength={MAX_CHARACTERS}
                        style={styles.answerInput}
                      />
                      <View style={styles.answerMeta}>
                        <Text
                          style={[
                            styles.charCount,
                            countWords(tempAnswer) < MIN_WORDS && tempAnswer.length > 0
                              ? styles.charCountWarning
                              : null,
                          ]}
                        >
                          {countWords(tempAnswer)} words • {tempAnswer.length}/{MAX_CHARACTERS} chars
                          {countWords(tempAnswer) < MIN_WORDS && tempAnswer.length > 0 && ` (min ${MIN_WORDS} words)`}
                        </Text>
                        <Pressable onPress={() => saveAnswer(prompt.id)} style={styles.saveButton}>
                          <Text style={styles.saveText}>Save</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.answerSection}>
                      {prompt.answer ? (
                        <>
                          <Text style={styles.answerText}>{prompt.answer}</Text>
                          {countWords(prompt.answer) < MIN_WORDS && (
                            <Text style={styles.warningText}>
                              Answer is too short (minimum {MIN_WORDS} words required)
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.placeholderText}>Tap to add your answer...</Text>
                      )}
                      <Pressable
                        onPress={() => startEditing(prompt.id)}
                        style={styles.editButton}
                      >
                        <Text style={styles.editText}>
                          {prompt.answer ? "Edit" : "Add Answer"}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Available prompts to select */}
        <View style={styles.availableSection}>
          <Text style={styles.sectionTitle}>
            {selectedCount >= 3 ? "Maximum prompts selected" : "Choose Prompts"}
          </Text>
          {promptGroups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              {group.prompts.map((prompt) => {
                const isSelected = selectedPrompts.some((p) => p.id === prompt.id);
                const isDisabled = !isSelected && selectedCount >= 3;
                return (
                  <Pressable
                    key={prompt.id}
                    onPress={() => !isDisabled && togglePrompt(prompt)}
                    disabled={isDisabled}
                    style={[
                      styles.promptOption,
                      isSelected && styles.promptOptionSelected,
                      isDisabled && styles.promptOptionDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.promptOptionText,
                        isSelected && styles.promptOptionTextSelected,
                      ]}
                    >
                      {prompt.question}
                    </Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {hasIncompleteAnswers && (
          <InlineError message={`Some answers are too short. Please write at least ${MIN_WORDS} words for each prompt.`} />
        )}
        {selectedCount < 2 && (
          <InlineError message="Please select at least 2 prompts and answer them to continue." />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Continue"
          onPress={() => navigation.navigate("VibeQuestion", { index: 0 })}
          disabled={!canContinue}
        />
        <Text style={styles.counter}>
          {selectedCount}/3 prompts selected • {answeredCount}/{selectedCount} answered
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: layout.major,
  },
  selectedSection: {
    marginBottom: layout.section * 2,
  },
  availableSection: {
    marginBottom: layout.section,
  },
  sectionTitle: {
    color: colors.textPrimary,
    ...typography.h3,
    marginBottom: layout.section,
    fontWeight: "600",
  },
  promptCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.card,
    padding: layout.section,
    marginBottom: layout.section,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: layout.compact,
    gap: layout.compact,
  },
  // Phase 1: Reorder controls
  reorderControls: {
    flexDirection: "column",
    gap: 2,
  },
  reorderButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  reorderHint: {
    color: colors.textMuted,
    ...typography.body2,
    fontSize: 12,
    marginBottom: layout.compact,
    fontStyle: "italic",
  },
  promptQuestion: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
    flex: 1,
    marginRight: layout.compact,
  },
  removeButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: colors.textSubtle,
    fontSize: 24,
    lineHeight: 24,
  },
  editSection: {
    marginTop: layout.compact,
  },
  answerInput: {
    minHeight: 100,
    marginBottom: layout.compact,
  },
  answerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    color: colors.textMuted,
    ...typography.micro,
  },
  charCountWarning: {
    color: colors.danger,
  },
  saveButton: {
    paddingHorizontal: layout.section,
    paddingVertical: layout.compact,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
  },
  saveText: {
    color: colors.onPrimary,
    ...typography.body2,
    fontWeight: "600",
  },
  answerSection: {
    marginTop: layout.compact,
  },
  answerText: {
    color: colors.textSecondary,
    ...typography.body2,
    lineHeight: 20,
    marginBottom: layout.compact,
  },
  warningText: {
    color: colors.danger,
    ...typography.micro,
    marginBottom: layout.compact,
  },
  placeholderText: {
    color: colors.textSubtle,
    ...typography.body2,
    fontStyle: "italic",
    marginBottom: layout.compact,
  },
  editButton: {
    alignSelf: "flex-start",
    paddingVertical: layout.compact,
  },
  editText: {
    color: colors.primary,
    ...typography.body2,
    fontWeight: "600",
  },
  group: {
    marginBottom: layout.section,
  },
  groupTitle: {
    color: colors.textSecondary,
    ...typography.micro,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: layout.compact,
  },
  promptOption: {
    backgroundColor: colors.surface2,
    borderRadius: radius.input,
    padding: layout.section,
    marginBottom: layout.compact,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  promptOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  promptOptionDisabled: {
    opacity: 0.4,
  },
  promptOptionText: {
    color: colors.textPrimary,
    ...typography.body2,
    flex: 1,
  },
  promptOptionTextSelected: {
    fontWeight: "600",
  },
  checkmark: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  footer: {
    paddingTop: layout.section,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  counter: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: layout.compact,
    ...typography.body2,
  },
  // Phase 1: Reorder controls
  reorderControls: {
    flexDirection: "column",
    gap: 2,
  },
  reorderButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  reorderHint: {
    color: colors.textMuted,
    ...typography.body2,
    fontSize: 12,
    marginBottom: layout.compact,
    fontStyle: "italic",
  },
});

export default PromptsScreen;



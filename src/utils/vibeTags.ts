import { VibeAnswers } from "./vibeScore";

const tagMap: Record<string, { tag: string; matches: string[] }> = {
  energy_level: {
    tag: "High Energy",
    matches: ["energetic", "hyper", "chaos"],
  },
  party_style: {
    tag: "Night Owl",
    matches: ["clubbing", "chaos", "house_party"],
  },
  conversation: {
    tag: "Deep Talks",
    matches: ["philosophy", "growth", "relationships"],
  },
};

export const deriveTags = (answers: VibeAnswers) => {
  const tags: string[] = [];
  Object.entries(tagMap).forEach(([key, rule]) => {
    const value = answers[key];
    if (value && rule.matches.includes(value)) {
      tags.push(rule.tag);
    }
  });
  return tags;
};

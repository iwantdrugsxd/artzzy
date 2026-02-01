import { deriveTags } from "./vibeTags";

export type VibeAnswers = Record<string, string>;

type VibeScoreResult = {
  score: number;
  tags: string[];
  reasons: string[];
};

const weights: Record<string, number> = {
  social_energy: 2,
  party_style: 2,
  spontaneity: 1,
  conversation: 1,
  alcohol: 1,
  energy_level: 2,
  group_size: 1,
  intent: 1,
};

export const vibeScore = (a: VibeAnswers, b: VibeAnswers): VibeScoreResult => {
  const keys = Object.keys(weights);
  let total = 0;
  let matched = 0;
  const reasons: string[] = [];

  keys.forEach((key) => {
    const weight = weights[key] ?? 1;
    total += weight;
    if (a[key] && b[key] && a[key] === b[key]) {
      matched += weight;
      reasons.push(key);
    }
  });

  const score = total === 0 ? 0 : Math.round((matched / total) * 100);
  const tags = Array.from(new Set([...deriveTags(a), ...deriveTags(b)]));

  return { score, tags, reasons };
};

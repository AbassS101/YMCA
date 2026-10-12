/**
 * YMCA Family-Friendly Community Profanity Filter
 * Automatically detects and censors profane or inappropriate words in forum topics,
 * replies, and class chat posts while avoiding false positives on substrings (Scunthorpe problem).
 */

export const PROFANITY_WORD_LIST: readonly string[] = [
  'asshole',
  'assholes',
  'bastard',
  'bastards',
  'bitch',
  'bitches',
  'bitching',
  'bitchy',
  'bollocks',
  'bullshit',
  'crap',
  'crappy',
  'cunt',
  'cunts',
  'damn',
  'dammit',
  'dickhead',
  'dipshit',
  'douche',
  'douchebag',
  'dumbass',
  'fag',
  'faggot',
  'fuck',
  'fucked',
  'fucker',
  'fuckers',
  'fucking',
  'fucks',
  'goddamn',
  'jackass',
  'motherfucker',
  'motherfucking',
  'nigga',
  'nigger',
  'piss',
  'pissed',
  'prick',
  'retard',
  'retarded',
  'shit',
  'shits',
  'shitty',
  'shitting',
  'slut',
  'sluts',
  'stfu',
  'twat',
  'wanker',
  'whore',
  'whores',
  'wtf',
];

const OBFUSCATED_PATTERNS: RegExp[] = [
  /\bf[\W_]*[u*@#][\W_]*c[\W_]*k(?:ing|er|ed|s)?\b/gi,
  /\bs[\W_]*h[\W_]*[i!1*@#][\W_]*t(?:ty|s|ting)?\b/gi,
  /\bb[\W_]*[i!1*@#][\W_]*t[\W_]*c[\W_]*h(?:es|ing)?\b/gi,
  /\ba[\W_]*[s$*@#][\W_]*[s$*@#][\W_]*h[\W_]*o[\W_]*l[\W_]*e(?:s)?\b/gi,
  /\bb[\W_]*u[\W_]*l[\W_]*l[\W_]*s[\W_]*h[\W_]*[i!1*@#][\W_]*t\b/gi,
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WORD_REGEX = new RegExp(
  `\\b(${PROFANITY_WORD_LIST.map(escapeRegex).join('|')})\\b`,
  'gi'
);

/**
 * Returns true if the provided text contains any profanity or obfuscated profanity.
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  WORD_REGEX.lastIndex = 0;
  if (WORD_REGEX.test(text)) return true;
  for (const pat of OBFUSCATED_PATTERNS) {
    pat.lastIndex = 0;
    if (pat.test(text)) return true;
  }
  return false;
}

/**
 * Returns an array of distinct lowercase profane words found in the text.
 */
export function findProfanityWords(text: string): string[] {
  if (!text) return [];
  const matches = new Set<string>();
  const wordMatches = text.match(WORD_REGEX);
  if (wordMatches) {
    for (const m of wordMatches) {
      matches.add(m.toLowerCase());
    }
  }
  for (const pat of OBFUSCATED_PATTERNS) {
    const obfMatches = text.match(pat);
    if (obfMatches) {
      for (const m of obfMatches) {
        matches.add(m.toLowerCase());
      }
    }
  }
  return Array.from(matches);
}

/**
 * Replaces any profane words or obfuscated profanity in the text with asterisks (e.g., "****").
 */
export function filterProfanity(text: string): string {
  if (!text) return text;
  let result = text.replace(WORD_REGEX, (match) => '*'.repeat(Math.max(4, match.length)));
  for (const pat of OBFUSCATED_PATTERNS) {
    result = result.replace(pat, (match) => '*'.repeat(Math.max(4, match.length)));
  }
  return result;
}

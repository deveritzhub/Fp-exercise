/**
 * Playing together with friends in the village: what can be said is a short list of fixed, friendly
 * sayings (no free text between patients).
 */
export const LIVE_SAYINGS = [
  { key: 'hi', nl: 'Hoi! 👋', en: 'Hi! 👋' },
  { key: 'together', nl: 'Zullen we samen gaan?', en: 'Shall we go together?' },
  { key: 'follow', nl: 'Volg mij!', en: 'Follow me!' },
  { key: 'help', nl: 'Help je mee?', en: 'Will you help?' },
  { key: 'gg', nl: 'Goed gedaan! 💪', en: 'Well done! 💪' },
  { key: 'thanks', nl: 'Dankjewel!', en: 'Thank you!' },
  { key: 'wait', nl: 'Wacht even', en: 'Wait a moment' },
  { key: 'bye', nl: 'Doei!', en: 'Bye!' },
] as const;
export type LiveSaying = (typeof LIVE_SAYINGS)[number]['key'];
export const sayingByKey = (key: string) => LIVE_SAYINGS.find((s) => s.key === key) ?? null;

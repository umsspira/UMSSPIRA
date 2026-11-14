export interface InterestTopic {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface InterestArea {
  id: string;
  name: string;
  description: string;
  topics: InterestTopic[];
}

export interface InterestConfiguration {
  areaIds: string[];
  topicIds: string[];
}

export const MIN_CUSTOM_TOPIC_LENGTH = 3;
export const MAX_CUSTOM_TOPIC_LENGTH = 50;
export const MAX_CUSTOM_TOPICS_PER_AREA = 5;

const BLOCKED_WORDS = new Set([
  'puta', 'puto', 'mierda', 'carajo', 'pendejo', 'pendeja', 'estupido', 'estupida',
  'idiota', 'imbecil', 'concha', 'coño', 'verga', 'culiao', 'culia', 'hdp',
  'chupame', 'maricon', 'porn', 'porno', 'sexo', 'nazi', 'violador', 'pedofilo',
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick',
]);

const HTML_TAG_REGEX = /<[^>]*>/i;
const SCRIPT_REGEX = /<script\b|javascript:|data:text\/html/i;
const SQL_INJECTION_REGEX = /(--|\b(select|drop|insert|delete|update|alter|truncate|exec|union)\b\s+)/i;
const VALID_CHARS_REGEX = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s+#.\-\/()]+$/;
const AT_LEAST_ONE_ALPHANUM_REGEX = /[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]/;

export function normalizeTopicText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function validateTopicInput(rawText: string): string | null {
  const cleaned = rawText.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return 'Escribe un tema de interés';
  }
  if (cleaned.length < MIN_CUSTOM_TOPIC_LENGTH || cleaned.length > MAX_CUSTOM_TOPIC_LENGTH) {
    return `El tema de interés debe tener entre ${MIN_CUSTOM_TOPIC_LENGTH} y ${MAX_CUSTOM_TOPIC_LENGTH} caracteres`;
  }
  if (HTML_TAG_REGEX.test(rawText) || SCRIPT_REGEX.test(rawText) || SQL_INJECTION_REGEX.test(cleaned)) {
    return 'El texto contiene caracteres no válidos';
  }
  if (!VALID_CHARS_REGEX.test(cleaned) || !AT_LEAST_ONE_ALPHANUM_REGEX.test(cleaned)) {
    return 'El texto contiene caracteres no válidos';
  }
  const normalized = normalizeTopicText(cleaned);
  for (const word of normalized.split(/\s+/)) {
    if (BLOCKED_WORDS.has(word)) {
      return 'El tema propuesto contiene lenguaje no permitido';
    }
  }
  return null;
}

export function normalizeInterests(catalog: InterestArea[], config: InterestConfiguration): InterestConfiguration {
  const areaIds = Array.from(new Set(config.areaIds)).filter(id => catalog.some(area => area.id === id));
  const allowed = new Set(catalog.filter(area => areaIds.includes(area.id)).flatMap(area => area.topics.map(topic => topic.id)));
  return { areaIds, topicIds: Array.from(new Set(config.topicIds)).filter(id => allowed.has(id)) };
}

export function sameConfiguration(a: InterestConfiguration, b: InterestConfiguration): boolean {
  return a.areaIds.length === b.areaIds.length && a.topicIds.length === b.topicIds.length
    && a.areaIds.every(id => b.areaIds.includes(id)) && a.topicIds.every(id => b.topicIds.includes(id));
}

// Built-in, rule-based checker (the "pre-LLM" approach): instant, offline, English.
// Each rule scans one block of plain text and reports {start, end, message, replacements, kind, rule}.

const MISSPELLINGS = Object.fromEntries(`
accomodate:accommodate acheive:achieve adress:address alot:a_lot apparantly:apparently arguement:argument basicly:basically
beacuse:because becuase:because begining:beginning beleive:believe buisness:business calender:calendar cemetary:cemetery
collegue:colleague comming:coming commitee:committee concensus:consensus concious:conscious definately:definitely
definatly:definitely dilemna:dilemma dissapoint:disappoint embarass:embarrass enviroment:environment existance:existence
finaly:finally foward:forward fourty:forty freind:friend goverment:government grammer:grammar guage:gauge happend:happened
harrass:harass immediatly:immediately independant:independent knowlege:knowledge liason:liaison libary:library
maintainance:maintenance millenium:millennium mispell:misspell neccessary:necessary necessery:necessary neice:niece
noticable:noticeable occassion:occasion occured:occurred occurence:occurrence paralell:parallel peice:piece persue:pursue
playwrite:playwright politican:politician posession:possession prefered:preferred priviledge:privilege
pronounciation:pronunciation publically:publicly questionaire:questionnaire realy:really reccomend:recommend
recieve:receive recieved:received recomend:recommend refered:referred relevent:relevant rythm:rhythm seperate:separate
seperately:separately sieze:seize speach:speech strenght:strength succede:succeed succesful:successful suprise:surprise
teh:the thier:their threshhold:threshold tommorow:tomorrow tommorrow:tomorrow tounge:tongue truely:truly untill:until
vaccuum:vacuum wich:which wierd:weird writting:writing acknowlege:acknowledge adresses:addresses agressive:aggressive
amatuer:amateur aquire:acquire bizzare:bizarre carreer:career catagory:category changable:changeable completly:completely
congradulations:congratulations conscientous:conscientious decieve:deceive desparate:desperate develope:develop
diffrent:different dissappear:disappear excercise:exercise exellent:excellent existant:existent experiance:experience
familar:familiar febuary:February foriegn:foreign gaurd:guard greatful:grateful hieght:height heirarchy:hierarchy
hygeine:hygiene ignorence:ignorance imediately:immediately interupt:interrupt irresistable:irresistible jewelery:jewelry
judgement:judgment lenght:length lightening:lightning managment:management mischievious:mischievous misspel:misspell
naturaly:naturally ocurred:occurred oppurtunity:opportunity orignal:original particulary:particularly perseverence:perseverance
pharoah:pharaoh posible:possible potatos:potatoes preceed:precede presense:presence probaly:probably reciept:receipt
refrence:reference religous:religious remeber:remember resistence:resistance responsability:responsibility
restaraunt:restaurant scedule:schedule sentance:sentence shedule:schedule sincerly:sincerely speciman:specimen
spontanious:spontaneous succesfully:successfully supercede:supersede tatoo:tattoo tendancy:tendency therefor:therefore
tomatos:tomatoes tommorow:tomorrow tradgedy:tragedy unfortunatly:unfortunately unneccessary:unnecessary vehical:vehicle
visable:visible wellfare:welfare wether:whether wholy:wholly yeild:yield irregardless:regardless supposably:supposedly
expresso:espresso`.trim().split(/\s+/).map((p) => p.replace('_', ' ').split(':')).filter(([a, b]) => a !== b));

// Phrase-level confusions: [pattern, replacement, message]
const CONFUSIONS = [
  [/\b(could|should|would|must|might) of\b/gi, (m, v) => `${v} have`, 'Use “have”, not “of”, after modal verbs.'],
  [/\b(more|less|better|worse|rather|other|greater|fewer|larger|smaller|higher|lower|faster|slower|older|younger) then\b/gi, (m, w) => `${w} than`, 'Use “than” for comparisons.'],
  [/\byour (welcome|right|wrong|correct|kidding|joking)\b/gi, (m, w) => `you're ${w}`, '“You’re” (you are) is needed here.'],
  [/\b[Ii]ts (a|an|the|been|not|going|time|important|clear|true|likely|possible|easy|hard|also|just|very|so|my|your|our|their)\b/g, (m, w) => `it's ${w}`, 'Did you mean “it’s” (it is / it has)?'],
  [/\bit's own\b/gi, () => 'its own', 'Possessive “its” has no apostrophe.'],
  [/\beach others\b/gi, () => "each other's", 'Possessive is “each other’s”.'],
  [/\bfree reign\b/gi, () => 'free rein', 'The idiom is “free rein”.'],
  [/\bpeak (my|your|his|her|their|our) (interest|curiosity)\b/gi, (m, a, b) => `pique ${a} ${b}`, '“Pique” means to arouse.'],
  [/\bsneak peak\b/gi, () => 'sneak peek', 'The idiom is “sneak peek”.'],
  [/\bbaited breath\b/gi, () => 'bated breath', 'The idiom is “bated breath”.'],
  [/\bone in the same\b/gi, () => 'one and the same', 'The idiom is “one and the same”.'],
  [/\bmake due\b/gi, () => 'make do', 'The idiom is “make do”.'],
  [/\bdeep seeded\b/gi, () => 'deep-seated', 'The idiom is “deep-seated”.'],
  [/\bfor all intensive purposes\b/gi, () => 'for all intents and purposes', 'The idiom is “for all intents and purposes”.'],
  [/\bper say\b/gi, () => 'per se', 'The Latin phrase is “per se”.'],
  [/\bcase and point\b/gi, () => 'case in point', 'The idiom is “case in point”.'],
  [/\bnip it in the butt\b/gi, () => 'nip it in the bud', 'The idiom is “nip it in the bud”.'],
  [/\bcould care less\b/gi, () => "couldn't care less", 'The idiom is “couldn’t care less”.'],
  [/\bfirst come,? first serve\b/gi, (m) => m + 'd', 'The phrase is “first come, first served”.'],
  [/\bwhose (is|are|was|been|going)\b/gi, (m, w) => `who's ${w}`, 'Did you mean “who’s” (who is / who has)?'],
  [/\bthere (is|was) (many|several|few|two|three|four|five|lots)\b/gi, (m, v, w) => `there ${v === 'is' ? 'are' : 'were'} ${w}`, 'Plural subject: use “are/were”.'],
  [/\b(a|one) (lot|couple) of\s+of\b/gi, (m, a, b) => `${a} ${b} of`, 'Repeated “of”.'],
  [/\bi\.e(?!\.)\b/g, () => 'i.e.', 'Write “i.e.” with two periods.'],
  [/\be\.g(?!\.)\b/g, () => 'e.g.', 'Write “e.g.” with two periods.'],
  [/\bsuppose to\b/gi, () => 'supposed to', 'Use “supposed to”.'],
  [/\buse to\b(?= \w)/gi, () => 'used to', 'Did you mean “used to”?'],
  [/\bloose (weight|track|sleep|money|interest)\b/gi, (m, w) => `lose ${w}`, '“Lose” is the verb; “loose” means not tight.'],
];

const WORDY = [
  ['in order to', 'to'], ['due to the fact that', 'because'], ['owing to the fact that', 'because'],
  ['at this point in time', 'now'], ['at the present time', 'now'], ['in the event that', 'if'],
  ['for the purpose of', 'for'], ['a large number of', 'many'], ['the majority of', 'most'],
  ['in spite of the fact that', 'although'], ['despite the fact that', 'although'], ['has the ability to', 'can'],
  ['is able to', 'can'], ['are able to', 'can'], ['in close proximity to', 'near'], ['each and every', 'each'],
  ['first and foremost', 'first'], ['in the near future', 'soon'], ['with regard to', 'about'],
  ['with respect to', 'about'], ['in regard to', 'about'], ['a majority of', 'most'], ['until such time as', 'until'],
  ['it is important to note that', ''], ['prior to', 'before'], ['subsequent to', 'after'],
  ['in light of the fact that', 'because'], ['on a daily basis', 'daily'], ['at all times', 'always'],
];

const REDUNDANT = [
  ['very unique', 'unique'], ['completely finished', 'finished'], ['end result', 'result'], ['past history', 'history'],
  ['free gift', 'gift'], ['advance planning', 'planning'], ['added bonus', 'bonus'], ['close proximity', 'proximity'],
  ['future plans', 'plans'], ['ATM machine', 'ATM'], ['PIN number', 'PIN'], ['revert back', 'revert'],
  ['return back', 'return'], ['repeat again', 'repeat'], ['basic fundamentals', 'fundamentals'],
  ['final outcome', 'outcome'], ['unexpected surprise', 'surprise'], ['join together', 'join'],
  ['still remains', 'remains'], ['true fact', 'fact'], ['absolutely essential', 'essential'],
  ['actual fact', 'fact'], ['collaborate together', 'collaborate'], ['plan ahead', 'plan'], ['reason why', 'reason'],
];

const IRREGULAR_PARTICIPLES = 'known done made given taken seen written built found shown told held sent paid heard kept brought bought thought caught taught chosen driven eaten forgotten hidden spoken stolen thrown worn begun drawn grown led lost meant sold spent struck sworn understood won broken frozen proven shaken beaten bitten forbidden';
const PASSIVE_RE = new RegExp(`\\b(am|is|are|was|were|be|been|being)\\s+(?:\\w+ly\\s+)?(\\w+ed|${IRREGULAR_PARTICIPLES.split(' ').join('|')})\\b`, 'gi');
// -ed words that usually act as adjectives after "to be".
const ADJECTIVAL_ED = /^(tired|interested|excited|bored|worried|confused|pleased|surprised|amazed|annoyed|scared|thrilled|ashamed|married|supposed|used|based|concerned|involved|related|located|prepared|determined|convinced|satisfied|disappointed|embarrassed|frustrated|relaxed|qualified|advanced|detailed|dedicated|committed|limited|focused|needed|exhausted|delighted|crowded|talented|experienced|organized|organised|complicated|sophisticated|motivated|inspired|red|bed|shed|seed|need|feed|speed|weed|hundred|sacred|naked|wicked|rugged|beloved|alleged|aged|wretched|learned|blessed|ragged|jagged|crooked)$/i;

// a/an: words that start with a vowel letter but a consonant sound, and vice versa.
const A_EXCEPTIONS = /^(uni|use|usu|uti|ure|eu|one|once|ubiq|ufo|uk\b|us\b|usa\b|ewe|uter|uran|ukr|ute)/i;
const AN_EXCEPTIONS = /^(hour|honest|honou?r|heir|herb\b)/i;
const ACRONYM_VOWEL_SOUND = /^[AEFHILMNORSX]([A-Z0-9]|$)/;

function matchCase(source, replacement) {
  if (!replacement) return replacement;
  if (source === source.toUpperCase() && source.length > 1) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

function* matches(re, text) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    yield m;
    if (m[0] === '') re.lastIndex++;
  }
}

function wordRe(phrase) {
  return new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}\\b`, 'gi');
}

const WORDY_RES = WORDY.map(([p, r]) => [wordRe(p), r]);
const REDUNDANT_RES = REDUNDANT.map(([p, r]) => [wordRe(p), r]);

export const RULE_GROUPS = {
  core: 'Spelling, grammar & punctuation',
  style: 'Style (wordy phrases, redundancy)',
  readability: 'Readability (passive voice, long sentences)',
  typography: 'Typography (smart quotes, dashes, ellipses)',
};

const RULES = [
  {
    id: 'misspelling', group: 'core', kind: 'spelling',
    run(text, out) {
      for (const m of matches(/[A-Za-z]+/g, text)) {
        const fix = MISSPELLINGS[m[0].toLowerCase()];
        if (fix) out.push({ start: m.index, end: m.index + m[0].length, message: `Common misspelling of “${fix}”.`, replacements: [matchCase(m[0], fix)] });
      }
    },
  },
  {
    id: 'confusion', group: 'core', kind: 'grammar',
    run(text, out) {
      for (const [re, fix, message] of CONFUSIONS) {
        for (const m of matches(re, text)) {
          out.push({ start: m.index, end: m.index + m[0].length, message, replacements: [matchCase(m[0], fix(...m))] });
        }
      }
    },
  },
  {
    id: 'repeated-word', group: 'core', kind: 'grammar',
    run(text, out) {
      for (const m of matches(/\b([A-Za-z']+)(\s+)\1\b/gi, text)) {
        if (/^(had|that|is|do|bye|ha|no|yeah|very|so)$/i.test(m[1])) continue;
        const start = m.index + m[1].length;
        out.push({ start, end: m.index + m[0].length, message: `Repeated word “${m[1]}”.`, replacements: [''] });
      }
    },
  },
  {
    id: 'a-an', group: 'core', kind: 'grammar',
    run(text, out) {
      for (const m of matches(/\b(a|an|A|An)\s+([A-Za-z][\w-]*)/g, text)) {
        const [, art, word] = m;
        const isAcronym = /^[A-Z]{2,}/.test(word) && word.length <= 5;
        let wantsAn;
        if (isAcronym) wantsAn = ACRONYM_VOWEL_SOUND.test(word);
        else if (AN_EXCEPTIONS.test(word)) wantsAn = true;
        else if (A_EXCEPTIONS.test(word)) wantsAn = false;
        else wantsAn = /^[aeiou]/i.test(word);
        const isAn = art.length === 2;
        if (wantsAn === isAn) continue;
        const fix = matchCase(art, wantsAn ? 'an' : 'a');
        out.push({ start: m.index, end: m.index + art.length, message: `Use “${fix}” before “${word}”.`, replacements: [fix] });
      }
    },
  },
  {
    id: 'lowercase-i', group: 'core', kind: 'capitalization',
    run(text, out) {
      for (const m of matches(/(?<![\w.])i(?=('m|'ve|'ll|'d|’m|’ve|’ll|’d)?(?![\w.]))/g, text)) {
        out.push({ start: m.index, end: m.index + 1, message: 'The pronoun “I” is always capitalised.', replacements: ['I'] });
      }
    },
  },
  {
    id: 'sentence-case', group: 'core', kind: 'capitalization',
    run(text, out, ctx) {
      const abbrev = /\b(e\.g|i\.e|etc|vs|cf|approx|incl|esp|al|fig|no|vol|pp|Dr|Mr|Mrs|Ms|St|Prof|Inc|Ltd|Jr|Sr)\.$/i;
      for (const m of matches(/([.!?])(["”’)]?)\s+([a-z])/g, text)) {
        const before = text.slice(0, m.index + 1);
        if (abbrev.test(before) || /\.\.$/.test(before) || /\d\.$/.test(before)) continue;
        const pos = m.index + m[0].length - 1;
        if (/^[a-z]+[A-Z]/.test(text.slice(pos, pos + 12))) continue; // iPhone, eBay
        out.push({ start: pos, end: pos + 1, message: 'Start sentences with a capital letter.', replacements: [m[3].toUpperCase()] });
      }
      if (ctx.kind === 'p' && /^[a-z][a-z]+\s/.test(text) && text.length > 24 && !/^[a-z]+[A-Z]/.test(text)) {
        out.push({ start: 0, end: 1, message: 'Start paragraphs with a capital letter.', replacements: [text[0].toUpperCase()] });
      }
    },
  },
  {
    id: 'spacing', group: 'core', kind: 'punctuation',
    run(text, out) {
      for (const m of matches(/(\S)( {2,})(?=\S)/g, text)) {
        const start = m.index + 1;
        out.push({ start, end: start + m[2].length, message: 'Multiple spaces.', replacements: [' '] });
      }
      for (const m of matches(/(?<=[A-Za-z)\]"”’])\s+([,;:!?]|\.(?!\.|\d))(?=\s|$)/g, text)) {
        out.push({ start: m.index, end: m.index + m[0].length, message: 'No space before punctuation.', replacements: [m[1]] });
      }
      for (const m of matches(/(?<=[a-z]{2})([,;])(?=[A-Za-z]{2})/g, text)) {
        out.push({ start: m.index, end: m.index + 1, message: 'Add a space after punctuation.', replacements: [m[1] + ' '] });
      }
      for (const m of matches(/(?<=\b[a-z]{3,})\.(?=[A-Z][a-z]+)/g, text)) {
        out.push({ start: m.index, end: m.index + 1, message: 'Add a space after the period.', replacements: ['. '] });
      }
      for (const m of matches(/([!?,;])\1+|(?<!\.)\.\.(?!\.)/g, text)) {
        const fix = m[0].startsWith('.') ? '.' : m[0][0];
        if (/[!?]/.test(fix)) continue; // emphatic !! / ?? is a style choice
        out.push({ start: m.index, end: m.index + m[0].length, message: 'Repeated punctuation.', replacements: [fix, '…'] });
      }
    },
  },
  {
    id: 'wordy', group: 'style', kind: 'style',
    run(text, out) {
      for (const [re, fix] of WORDY_RES) {
        for (const m of matches(re, text)) {
          out.push({ start: m.index, end: m.index + m[0].length, message: fix ? `Wordy: “${fix}” is more concise.` : 'Wordy: this phrase can usually be removed.', replacements: [matchCase(m[0], fix)] });
        }
      }
    },
  },
  {
    id: 'redundant', group: 'style', kind: 'style',
    run(text, out) {
      for (const [re, fix] of REDUNDANT_RES) {
        for (const m of matches(re, text)) {
          out.push({ start: m.index, end: m.index + m[0].length, message: `Redundant: “${fix}” says the same thing.`, replacements: [matchCase(m[0], fix)] });
        }
      }
    },
  },
  {
    id: 'passive', group: 'readability', kind: 'style',
    run(text, out) {
      for (const m of matches(PASSIVE_RE, text)) {
        if (ADJECTIVAL_ED.test(m[2])) continue;
        out.push({ start: m.index, end: m.index + m[0].length, message: 'Passive voice: consider an active construction.', replacements: [] });
      }
    },
  },
  {
    id: 'long-sentence', group: 'readability', kind: 'readability',
    run(text, out) {
      for (const m of matches(/[^.!?]+[.!?]*/g, text)) {
        const words = m[0].trim().split(/\s+/).filter(Boolean).length;
        if (words > 40) {
          const lead = m[0].match(/^\s*/)[0].length;
          out.push({ start: m.index + lead, end: m.index + m[0].trimEnd().length, message: `Long sentence (${words} words). Consider splitting it.`, replacements: [] });
        }
      }
    },
  },
  {
    id: 'typography', group: 'typography', kind: 'typography',
    run(text, out) {
      for (const m of matches(/(^|[\s(\[])"([^"]+)"/g, text)) {
        const s = m.index + m[1].length;
        out.push({ start: s, end: s + m[0].length - m[1].length, message: 'Use curly quotes.', replacements: [`“${m[2]}”`] });
      }
      for (const m of matches(/(\w)'(\w)/g, text)) {
        out.push({ start: m.index + 1, end: m.index + 2, message: 'Use a typographic apostrophe.', replacements: ['’'] });
      }
      for (const m of matches(/(\w) ?--? ?(\w)/g, text)) {
        if (/\w-\w/.test(m[0])) continue;
        out.push({ start: m.index + 1, end: m.index + m[0].length - 1, message: 'Use an em dash.', replacements: ['—', ' – '] });
      }
      for (const m of matches(/\.\.\./g, text)) {
        out.push({ start: m.index, end: m.index + 3, message: 'Use an ellipsis character.', replacements: ['…'] });
      }
    },
  },
];

/**
 * @param {{id: string, text: string, kind: string}[]} blocks
 * @param {{groups: Record<string, boolean>}} options
 */
export function checkBlocks(blocks, options) {
  const groups = options.groups || { core: true, style: true };
  const issues = [];
  for (const block of blocks) {
    if (block.kind === 'code') continue;
    for (const rule of RULES) {
      if (!groups[rule.group]) continue;
      const found = [];
      rule.run(block.text, found, block);
      for (const f of found) {
        issues.push({ blockId: block.id, kind: rule.kind, rule: rule.id, source: 'rules', ...f });
      }
    }
  }
  return issues;
}

/**
 * UI copy for English and Hindi. Keys are shared; missing keys fall back to en.
 */

import type { Locale } from "@/lib/i18n/locale";

const en = {
  "skip.main": "Skip to main content",
  "lang.aria": "Language: {label}. Switch language",
  "lang.aria.current": "Language: {label}",

  "home.greeting.morning": "Good morning",
  "home.greeting.afternoon": "Good afternoon",
  "home.greeting.evening": "Good evening",
  "home.title": "Let's look at your lease.",
  "home.expired": "Your session ended. Upload your lease again to continue.",
  "home.upload.heading": "Add your document.",
  "home.upload.hint": "PDF or plain text — photo upload comes later.",
  "home.upload.choose": "Choose file",
  "home.upload.reading": "Reading document…",
  "home.upload.chooseAria": "Choose a PDF or text file",
  "home.upload.photo": "Take photo (coming later)",
  "home.upload.photoAria": "Take photo — coming in a later phase",
  "home.upload.privacy":
    "Processed in memory for this session only — nothing is saved to a database.",
  "home.upload.error": "Upload failed. Please try again.",
  "home.upload.offline":
    "Could not reach the server. Check your connection and try again.",
  "home.afterUpload":
    "No document handy? Ask a question anyway — available after upload in a later phase.",
  "home.recent": "Recent",
  "home.recent.empty":
    "No saved documents — sessions end when you close this tab.",
  "home.nav.primary": "Primary",
  "home.nav.home": "Home",
  "home.nav.documents": "Documents",
  "home.nav.settings": "Settings",
  "home.loading": "Loading…",

  "overview.backHome": "Back to Home",
  "overview.loading": "Loading overview…",
  "overview.loadError": "Could not load your document. Please try again.",
  "overview.notFound": "Session not found.",
  "overview.deposit": "Deposit",
  "overview.leaseStart": "Lease start",
  "overview.notice": "Notice",
  "overview.whatNext": "What would you like to do?",
  "overview.clauses": "Clauses ({count})",
  "overview.clause": "Clause {index}",
  "overview.regime.mh":
    "Likely governed by the Maharashtra Rent Control Act — Chat can cite statute excerpts for this state.",
  "overview.regime.up":
    "Likely governed by the UP Urban Premises Tenancy Act — Chat can cite statute excerpts for this state.",
  "overview.regime.other":
    "State detected: {state}. Chat will retrieve the closest available statute excerpts.",
  "overview.residential": "Residential lease",

  "activity.chat.title": "Chat with it",
  "activity.chat.description": "Ask anything about your lease.",
  "activity.simplify.title": "Simplify it",
  "activity.simplify.description": "Plain language, clause by clause.",
  "activity.summary.title": "Summary & checklist",
  "activity.summary.description": "Key facts, flags, to-dos.",
  "activity.options.title": "Your options",
  "activity.options.description": "What you can do next.",

  "simplify.title": "Simplified",
  "simplify.loading": "Simplifying your lease…",
  "simplify.error": "Could not simplify this document. Please try again.",
  "simplify.tablist": "Text view",
  "simplify.plain": "Plain language",
  "simplify.original": "Original text",
  "simplify.clause": "Clause {index}",
  "simplify.clauseFallback": "Clause",

  "chat.title": "Chat",
  "chat.loading": "Opening chat…",
  "chat.loadError": "Could not load your session. Please try again.",
  "chat.greeting":
    "I've read your lease. Ask me about deposits, notice periods, subletting, or anything else in the agreement.",
  "chat.thinking": "Thinking…",
  "chat.liveReply": "New reply from Clarity.",
  "chat.error": "Could not answer that question.",
  "chat.errorRetry": "Could not answer that question. Please try again.",
  "chat.placeholder": "Ask about your lease…",
  "chat.inputLabel": "Ask about your lease",
  "chat.send": "Send message",
  "chat.suggestion.sublet": "Can I sublet?",
  "chat.suggestion.depositLegal": "Is this deposit legal?",
  "chat.suggestion.depositKeep": "Can the landlord keep my full deposit?",

  "chrome.backOverview": "Back to overview",
  "error.retry": "Retry",
  "error.backOverview": "Back to Overview",
  "error.backHome": "Back to Home",
} as const;

export type MessageKey = keyof typeof en;

const hi: Record<MessageKey, string> = {
  "skip.main": "मुख्य सामग्री पर जाएँ",
  "lang.aria": "भाषा: {label}। भाषा बदलें",
  "lang.aria.current": "भाषा: {label}",

  "home.greeting.morning": "सुप्रभात",
  "home.greeting.afternoon": "नमस्कार",
  "home.greeting.evening": "शुभ संध्या",
  "home.title": "आइए आपके किरायानामा को देखें।",
  "home.expired":
    "आपका सत्र समाप्त हो गया। जारी रखने के लिए किरायानामा फिर अपलोड करें।",
  "home.upload.heading": "अपना दस्तावेज़ जोड़ें।",
  "home.upload.hint": "PDF या सादा पाठ — फोटो अपलोड बाद में आएगा।",
  "home.upload.choose": "फ़ाइल चुनें",
  "home.upload.reading": "दस्तावेज़ पढ़ा जा रहा है…",
  "home.upload.chooseAria": "PDF या टेक्स्ट फ़ाइल चुनें",
  "home.upload.photo": "फोटो लें (जल्द आ रहा है)",
  "home.upload.photoAria": "फोटो लें — बाद के चरण में",
  "home.upload.privacy":
    "केवल इस सत्र के लिए मेमोरी में प्रोसेस — डेटाबेस में कुछ नहीं सहेजा जाता।",
  "home.upload.error": "अपलोड असफल रहा। कृपया फिर कोशिश करें।",
  "home.upload.offline":
    "सर्वर से संपर्क नहीं हो सका। कनेक्शन जाँचें और फिर कोशिश करें।",
  "home.afterUpload":
    "दस्तावेज़ नहीं है? बाद में अपलोड के बाद बिना दस्तावेज़ के भी पूछ सकेंगे।",
  "home.recent": "हाल ही में",
  "home.recent.empty":
    "कोई सहेजा दस्तावेज़ नहीं — टैब बंद होने पर सत्र समाप्त हो जाता है।",
  "home.nav.primary": "मुख्य",
  "home.nav.home": "होम",
  "home.nav.documents": "दस्तावेज़",
  "home.nav.settings": "सेटिंग्स",
  "home.loading": "लोड हो रहा है…",

  "overview.backHome": "होम पर वापस",
  "overview.loading": "अवलोकन लोड हो रहा है…",
  "overview.loadError": "दस्तावेज़ लोड नहीं हो सका। कृपया फिर कोशिश करें।",
  "overview.notFound": "सत्र नहीं मिला।",
  "overview.deposit": "जमा राशि",
  "overview.leaseStart": "किराया शुरू",
  "overview.notice": "नोटिस",
  "overview.whatNext": "आप क्या करना चाहेंगे?",
  "overview.clauses": "क्लॉज़ ({count})",
  "overview.clause": "क्लॉज़ {index}",
  "overview.regime.mh":
    "संभवतः महाराष्ट्र किराया नियंत्रण अधिनियम लागू — चैट इस राज्य के कानून अंश उद्धृत कर सकता है।",
  "overview.regime.up":
    "संभवतः यूपी शहरी परिसर किरायेदारी अधिनियम लागू — चैट इस राज्य के कानून अंश उद्धृत कर सकता है।",
  "overview.regime.other":
    "राज्य: {state}। चैट उपलब्ध निकटतम कानून अंश खोजेगा।",
  "overview.residential": "आवासीय किरायानामा",

  "activity.chat.title": "चैट करें",
  "activity.chat.description": "किरायानामा के बारे में कुछ भी पूछें।",
  "activity.simplify.title": "सरल बनाएँ",
  "activity.simplify.description": "क्लॉज़-दर-क्लॉज़ सरल भाषा।",
  "activity.summary.title": "सारांश और सूची",
  "activity.summary.description": "मुख्य तथ्य, संकेत, काम।",
  "activity.options.title": "आपके विकल्प",
  "activity.options.description": "आगे क्या कर सकते हैं।",

  "simplify.title": "सरल रूप",
  "simplify.loading": "किरायानामा सरल किया जा रहा है…",
  "simplify.error": "दस्तावेज़ सरल नहीं हो सका। कृपया फिर कोशिश करें।",
  "simplify.tablist": "पाठ दृश्य",
  "simplify.plain": "सरल भाषा",
  "simplify.original": "मूल पाठ",
  "simplify.clause": "क्लॉज़ {index}",
  "simplify.clauseFallback": "क्लॉज़",

  "chat.title": "चैट",
  "chat.loading": "चैट खुल रहा है…",
  "chat.loadError": "सत्र लोड नहीं हो सका। कृपया फिर कोशिश करें।",
  "chat.greeting":
    "मैंने आपका किरायानामा पढ़ लिया है। जमा राशि, नोटिस अवधि, सबलेट या समझौते की किसी भी बात के बारे में पूछें।",
  "chat.thinking": "सोच रहा हूँ…",
  "chat.liveReply": "क्लैरिटी से नया जवाब।",
  "chat.error": "इस प्रश्न का उत्तर नहीं दे सके।",
  "chat.errorRetry": "इस प्रश्न का उत्तर नहीं दे सके। कृपया फिर कोशिश करें।",
  "chat.placeholder": "किरायानामा के बारे में पूछें…",
  "chat.inputLabel": "किरायानामा के बारे में पूछें",
  "chat.send": "संदेश भेजें",
  "chat.suggestion.sublet": "क्या मैं सबलेट कर सकता/सकती हूँ?",
  "chat.suggestion.depositLegal": "क्या यह जमा राशि कानूनी है?",
  "chat.suggestion.depositKeep":
    "क्या मकान मालिक मेरी पूरी जमा राशि रख सकता है?",

  "chrome.backOverview": "अवलोकन पर वापस",
  "error.retry": "फिर कोशिश करें",
  "error.backOverview": "अवलोकन पर वापस",
  "error.backHome": "होम पर वापस",
};

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en: en as Record<MessageKey, string>,
  hi,
};

export type MessageVars = Record<string, string | number>;

/**
 * Look up a UI string for the locale, with `{var}` interpolation.
 * Falls back to English if a key is missing.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: MessageVars,
): string {
  const raw = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] != null ? String(vars[name]) : `{${name}}`,
  );
}

/** Greeting key for the current hour (local time). */
export function greetingKey(hour: number): MessageKey {
  if (hour < 12) return "home.greeting.morning";
  if (hour < 17) return "home.greeting.afternoon";
  return "home.greeting.evening";
}

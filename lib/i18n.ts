import type { Language } from "@/types";

export const strings = {
  en: {
    appTitle: "Wedding Playlist",
    appSubtitle: "Curate the soundtrack of your special day",
    addTracks: "Add tracks",
    upload: "Upload audio",
    uploadHint: "Drop mp3, wav or m4a files here, or click to choose",
    uploadButton: "Choose files",
    youtubeTab: "YouTube link",
    youtubePlaceholder: "Paste a YouTube URL",
    youtubeAdd: "Add",
    youtubeInvalid: "That doesn't look like a valid YouTube URL.",
    youtubeFetching: "Fetching video info…",
    youtubeNote:
      "YouTube videos are embedded and played via YouTube's official player. They are never downloaded.",
    playlist: "Playlist",
    empty: "Your playlist is empty",
    emptyHint: "Upload audio files or paste a YouTube link to begin.",
    track: "track",
    tracks: "tracks",
    play: "Play",
    pause: "Pause",
    next: "Next",
    previous: "Previous",
    volume: "Volume",
    rename: "Rename",
    delete: "Delete",
    moveUp: "Move up",
    moveDown: "Move down",
    save: "Save",
    cancel: "Cancel",
    nowPlaying: "Now playing",
    nothingPlaying: "Nothing playing",
    export: "Export JSON",
    importJson: "Import JSON",
    importConfirm:
      "Importing will replace your current playlist (uploaded audio not in the file will stop working). Continue?",
    importError: "That file isn't a valid playlist export.",
    clearAll: "Clear playlist",
    clearConfirm: "Remove all tracks from the playlist?",
    sourceUpload: "Uploaded",
    sourceYouTube: "YouTube",
    unplayable: "Unplayable",
    unplayableHint:
      "The original file is no longer in browser storage. Re-upload it to play.",
    languageToggle: "العربية",
    autoplayNext: "Autoplay next",
    samplesLoaded: "Sample playlist loaded",
    deployHint: "Ready to deploy to Vercel, Netlify or any static host.",
  },
  ar: {
    appTitle: "قائمة تشغيل الزفاف",
    appSubtitle: "اختر موسيقى يومك المميز",
    addTracks: "إضافة مقاطع",
    upload: "رفع ملف صوتي",
    uploadHint: "أسقط ملفات mp3 أو wav أو m4a هنا، أو اضغط للاختيار",
    uploadButton: "اختيار الملفات",
    youtubeTab: "رابط يوتيوب",
    youtubePlaceholder: "ألصق رابط يوتيوب",
    youtubeAdd: "إضافة",
    youtubeInvalid: "هذا الرابط لا يبدو رابط يوتيوب صحيح.",
    youtubeFetching: "جاري جلب معلومات الفيديو…",
    youtubeNote:
      "يتم تضمين مقاطع يوتيوب وتشغيلها عبر مشغّل يوتيوب الرسمي فقط، ولا يتم تحميلها أبداً.",
    playlist: "قائمة التشغيل",
    empty: "قائمة التشغيل فارغة",
    emptyHint: "ارفع ملفات صوتية أو ألصق رابط يوتيوب للبدء.",
    track: "مقطع",
    tracks: "مقاطع",
    play: "تشغيل",
    pause: "إيقاف",
    next: "التالي",
    previous: "السابق",
    volume: "الصوت",
    rename: "تعديل الاسم",
    delete: "حذف",
    moveUp: "تحريك لأعلى",
    moveDown: "تحريك لأسفل",
    save: "حفظ",
    cancel: "إلغاء",
    nowPlaying: "قيد التشغيل",
    nothingPlaying: "لا يوجد تشغيل",
    export: "تصدير JSON",
    importJson: "استيراد JSON",
    importConfirm:
      "الاستيراد سيستبدل القائمة الحالية (الملفات المرفوعة وغير المتوفرة لن تعمل). متابعة؟",
    importError: "هذا الملف ليس قائمة تشغيل صحيحة.",
    clearAll: "مسح القائمة",
    clearConfirm: "حذف جميع المقاطع من القائمة؟",
    sourceUpload: "مرفوع",
    sourceYouTube: "يوتيوب",
    unplayable: "غير قابل للتشغيل",
    unplayableHint:
      "الملف الأصلي لم يعد في تخزين المتصفح. أعد رفعه للتشغيل.",
    languageToggle: "English",
    autoplayNext: "تشغيل تلقائي للتالي",
    samplesLoaded: "تم تحميل قائمة تجريبية",
    deployHint: "جاهز للنشر على Vercel أو Netlify أو أي استضافة ثابتة.",
  },
} as const;

export type StringKey = keyof typeof strings.en;

export function t(lang: Language, key: StringKey): string {
  return strings[lang][key];
}

export function dir(lang: Language): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

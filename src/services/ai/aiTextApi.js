import { api } from "../api";

export const aiTextApi = {
  async suggestWording(text, language = "ar", context = {}) {
    const { data } = await api.post("suggest-wording/", {
      text,
      language,
      ...context,
    });
    return data; // { suggestions, suggestion, previous_variations? }
  },

  async transcribeAudio(audioBlob, { language, field, prompt } = {}) {
    const formData = new FormData();
    const extension = audioBlob?.type?.includes("wav") ? "wav" : "webm";
    formData.append("audio", audioBlob, `voice-note.${extension}`);
    if (language) formData.append("language", language);
    if (field) formData.append("field", field);
    if (prompt) formData.append("prompt", prompt);

    const { data } = await api.post("transcribe-audio/", formData);
    return data; // { text: string, model: string }
  },

  async checkRemarksOverlap(newLines, generalRemarks) {
    const { data } = await api.post("check-remarks-overlap/", {
      new_lines: newLines,
      general_remarks: generalRemarks,
    });
    return data; // { overlaps: [{ line, matched_point, reason }] }
  },

  async suggestRemarkFromImage(imageFile, language = "en") {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("language", language);
    const { data } = await api.post("suggest-remark-from-image/", formData);
    return data; // { suggestions: string[], suggestion: string }
  },

  async suggestVariationRemarks(noticeData) {
    const { data } = await api.post("suggest-variation-remarks/", noticeData);
    return data; // { suggestions: string[], suggestion: string }
  },
};

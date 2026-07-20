import { api } from "../api";

export const aiTextApi = {
  async suggestWording(text, language = "ar") {
    const { data } = await api.post("suggest-wording/", { text, language });
    return data; // { suggestions: string[], suggestion: string }
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
};

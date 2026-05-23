import { api } from "../../services/api";

export const aiAssistantApi = {
  async sendMessage(query, language = "ar", history = [], projectId = null) {
    const response = await api.post("ai-assistant/message/", {
      query,
      language,
      history,
      ...(projectId ? { project_id: projectId } : {}),
    });
    return response.data;
  },

  async createProject(files, language = "ar") {
    const form = new FormData();
    form.append("language", language);
    if (files.site_plan) form.append("site_plan", files.site_plan);
    if (files.owner_id) form.append("owner_id", files.owner_id);
    if (files.build_permit) form.append("build_permit", files.build_permit);
    if (files.contract) form.append("contract", files.contract);

    const response = await api.post("ai-assistant/create-project/", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180000, // 3 min — parsing multiple PDFs takes time
    });
    return response.data;
  },
};

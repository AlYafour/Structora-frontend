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
    if (files.owner_signature) form.append("owner_signature", files.owner_signature);
    if (files.consultant_stamp) form.append("consultant_stamp", files.consultant_stamp);

    const response = await api.post("ai-assistant/create-project/", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180000,
    });
    return response.data;
  },

  async executeAction(action, projectId = null, language = "ar") {
    const response = await api.post("ai-assistant/execute-action/", {
      action,
      language,
      ...(projectId ? { project_id: projectId } : {}),
    });
    return response.data;
  },

  async validateDocuments(files = {}, language = "ar", formData = {}) {
    const form = new FormData();
    form.append("language", language);
    if (formData && Object.keys(formData).length > 0) {
      form.append("form_data", JSON.stringify(formData));
    }
    if (files.site_plan   instanceof File) form.append("site_plan",    files.site_plan);
    if (files.owner_id    instanceof File) form.append("owner_id",     files.owner_id);
    if (files.build_permit instanceof File) form.append("build_permit", files.build_permit);
    if (files.contract    instanceof File) form.append("contract",     files.contract);

    const response = await api.post("ai-assistant/validate-documents/", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 90000,
    });
    return response.data;
  },

  async importExcel(file, { projectId = null, dataType = "auto", dryRun = true, language = "ar" } = {}) {
    const form = new FormData();
    form.append("file", file);
    form.append("data_type", dataType);
    form.append("dry_run", dryRun ? "true" : "false");
    form.append("language", language);
    if (projectId) form.append("project_id", projectId);

    const response = await api.post("ai-assistant/import-excel/", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });
    return response.data;
  },
};

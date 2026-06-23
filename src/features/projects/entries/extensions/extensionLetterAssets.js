import { api } from "../../../../services/api";

export async function toBase64(url) {
  if (!url) return null;
  try {
    let path = url;
    try {
      path = new URL(url).pathname;
      path = path.replace(/^\/api\//, "");
    } catch {
      path = url;
    }
    const { data } = await api.get(path, { responseType: "blob" });
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(data);
    });
  } catch {
    return null;
  }
}

async function detectPortrait(src) {
  if (!src || typeof window === "undefined") return false;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img.naturalHeight > img.naturalWidth);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

export async function prepareExtensionLetterAssets(data) {
  const prepared = { ...(data || {}) };

  if (prepared.letterhead_url) {
    prepared.letterhead_url = (await toBase64(prepared.letterhead_url)) || prepared.letterhead_url;
  }

  if (Array.isArray(prepared.attachments)) {
    prepared.attachments = await Promise.all(
      prepared.attachments.map(async (att) => {
        if (!att?.is_image || !att.url) return att;
        const base64Url = await toBase64(att.url);
        if (!base64Url) return { ...att, is_image: false };
        const isPortrait = await detectPortrait(base64Url);
        return { ...att, url: base64Url, isPortrait };
      })
    );
  }

  return prepared;
}

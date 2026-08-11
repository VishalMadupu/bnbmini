export const isMobile = (v) => /^[6-9]\d{9}$/.test((v || "").trim());
export const isEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((v || "").trim());
export const isValidContact = (v) => isMobile(v) || isEmail(v);
export const isUrl = (v) => /^https?:\/\/.+/i.test((v || "").trim());

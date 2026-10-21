import { digitsPhone } from "./calc";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "true");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function whatsappUrl(phone: string, text: string) {
  const n = digitsPhone(phone);
  const base = n ? `https://wa.me/${n}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function smsUrl(phone: string, text: string) {
  const n = digitsPhone(phone);
  return `sms:${n}?body=${encodeURIComponent(text)}`;
}

export async function shareText(title: string, text: string) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "aborted" as const;
    }
  }
  const ok = await copyText(text);
  return ok ? ("copied" as const) : ("failed" as const);
}

import { Font } from "@react-pdf/renderer";

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

let registered = false;

export function registerPDFFonts() {
  if (registered) return;
  registered = true;
  Font.register({
    family: "Cairo",
    fonts: [
      { src: `${ORIGIN}/fonts/Cairo-Regular.ttf`, fontWeight: 400 },
      { src: `${ORIGIN}/fonts/Cairo-Bold.ttf`,    fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
}

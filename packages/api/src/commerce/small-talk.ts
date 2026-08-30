const GREETING_RE =
  /^(oi|ol[áa]|bom dia|boa tarde|boa noite|e[\s-]?a[ií]|fala|opa|oii+)[\s!?.,;:\-–—…]*$/i;

export const isSmallTalk = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return GREETING_RE.test(trimmed);
};

(() => {
  "use strict";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const digitMap = value => String(value).replace(/[0-9]/g, digit => persianDigits[digit.charCodeAt(0) - 48]);
  const skippedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
  const visibleNumberAttributes = ["title", "aria-label", "placeholder", "alt"];

  function localizeNode(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && !parent.closest("script, style, noscript")) {
        const updated = digitMap(node.nodeValue);
        if (updated !== node.nodeValue) node.nodeValue = updated;
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || skippedTags.has(node.tagName)) return;

    for (const attribute of visibleNumberAttributes) {
      if (node.hasAttribute(attribute)) {
        const current = node.getAttribute(attribute);
        const updated = digitMap(current);
        if (updated !== current) node.setAttribute(attribute, updated);
      }
    }
    for (const child of Array.from(node.childNodes)) localizeNode(child);
  }

  function start() {
    localizeNode(document.documentElement);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "characterData") localizeNode(record.target);
        else for (const added of record.addedNodes) localizeNode(added);
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();

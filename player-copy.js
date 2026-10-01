(async function loadPlayerCopy() {
  const textMap = new Map();
  const handledText = new WeakMap();
  const handledAttributes = new WeakMap();
  const replaceableAttributes = ['aria-label', 'alt', 'placeholder', 'title'];

  function replaceTextNode(node) {
    if (node.parentElement?.closest('.welcome-back')) return;
    const original = node.nodeValue || '';
    const key = original.trim();
    if (!key || !textMap.has(key)) return;

    let handled = handledText.get(node);
    if (!handled) {
      handled = new Set();
      handledText.set(node, handled);
    }
    if (handled.has(key)) return;
    handled.add(key);

    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    node.nodeValue = `${leading}${textMap.get(key)}${trailing}`;
  }

  function replaceAttributes(element) {
    let handled = handledAttributes.get(element);
    if (!handled) {
      handled = new Map();
      handledAttributes.set(element, handled);
    }

    replaceableAttributes.forEach(attribute => {
      if (!element.hasAttribute(attribute)) return;
      const original = element.getAttribute(attribute) || '';
      const key = original.trim();
      if (!key || !textMap.has(key)) return;

      let values = handled.get(attribute);
      if (!values) {
        values = new Set();
        handled.set(attribute, values);
      }
      if (values.has(key)) return;
      values.add(key);
      element.setAttribute(attribute, textMap.get(key));
    });
  }

  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      replaceTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

    if (root.nodeType === Node.ELEMENT_NODE) replaceAttributes(root);
    root.querySelectorAll?.('*').forEach(replaceAttributes);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (!node.parentElement?.closest('script,style,textarea')) replaceTextNode(node);
      node = walker.nextNode();
    }
  }

  try {
    const response = await fetch('/api/player-copy', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    (Array.isArray(data.entries) ? data.entries : []).forEach(entry => {
      const from = String(entry?.from || '').trim();
      const to = String(entry?.to ?? '');
      if (from && from !== to) textMap.set(from, to);
    });
    if (!textMap.size) return;

    scan(document.body);
    new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === 'characterData') replaceTextNode(record.target);
        if (record.type === 'attributes') replaceAttributes(record.target);
        record.addedNodes?.forEach(scan);
      });
    }).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: replaceableAttributes
    });
  } catch {}
})();

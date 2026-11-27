/**
 * CodeMirror 6 Editor Manager (content.md & style.css tabs)
 */
import {
  EditorState,
  Compartment,
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  highlightSpecialChars,
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  undo,
  redo,
  selectAll,
  defaultHighlightStyle,
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
  search,
  searchKeymap,
  openSearchPanel,
  highlightSelectionMatches,
  closeBrackets,
  closeBracketsKeymap,
  markdown,
  markdownLanguage,
  css,
  oneDark,
} from '../vendor/codemirror.esm.js';

const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#18202c',
  },
  '.cm-gutters': {
    backgroundColor: '#f6f7f9',
    color: '#7b8798',
    borderRight: '1px solid #e2e7ef',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(122, 31, 43, 0.045)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(122, 31, 43, 0.08)',
  },
  '.cm-cursor': {
    borderLeftColor: '#7a1f2b',
  },
});

export function createCodeEditor(hostEl, {
  initialContent,
  initialCss,
  isDark,
  onChangeContent,
  onChangeCss,
  onDropImages,
  onRequestMarkdownTab,
}) {
  const themeCompartment = new Compartment();
  let activeTab = 'content';
  let suppressChange = false;

  const baseExtensions = (langExt, onDocChange) => [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search(),
    EditorView.lineWrapping,
    langExt,
    themeCompartment.of(isDark ? oneDark : lightTheme),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      indentWithTab,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !suppressChange) {
        onDocChange(update.state.doc.toString());
      }
    }),
  ];

  let contentState = EditorState.create({
    doc: initialContent,
    extensions: baseExtensions(markdown({ base: markdownLanguage }), (v) => onChangeContent(v)),
  });

  let cssState = EditorState.create({
    doc: initialCss,
    extensions: baseExtensions(css(), (v) => onChangeCss(v)),
  });

  const view = new EditorView({
    state: contentState,
    parent: hostEl,
  });

  // Handle drag-and-drop & paste of images directly into content.md
  hostEl.addEventListener('dragover', (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.items || []).some((it) => it.type.startsWith('image/'))) {
      e.preventDefault();
    }
  });

  hostEl.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0 && typeof onDropImages === 'function') {
      e.preventDefault();
      onDropImages(files);
    }
  });

  hostEl.addEventListener('paste', (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageFiles = items
      .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter(Boolean);
    if (imageFiles.length > 0 && typeof onDropImages === 'function') {
      e.preventDefault();
      onDropImages(imageFiles);
    }
  });

  function switchTab(tab) {
    if (tab !== 'content' && tab !== 'css') return;
    if (tab === activeTab) {
      view.focus();
      return;
    }
    if (activeTab === 'content') {
      contentState = view.state;
    } else {
      cssState = view.state;
    }
    activeTab = tab;
    view.setState(activeTab === 'content' ? contentState : cssState);
    view.focus();
  }

  function setTheme(dark) {
    const ext = dark ? oneDark : lightTheme;
    view.dispatch({ effects: themeCompartment.reconfigure(ext) });
    if (activeTab === 'content') {
      cssState = cssState.update({ effects: themeCompartment.reconfigure(ext) }).state;
    } else {
      contentState = contentState.update({ effects: themeCompartment.reconfigure(ext) }).state;
    }
  }

  function replaceDocuments(nextContent, nextCss) {
    suppressChange = true;
    try {
      const darkExt = themeCompartment.get(view.state);
      contentState = EditorState.create({
        doc: nextContent,
        extensions: baseExtensions(markdown({ base: markdownLanguage }), (v) => onChangeContent(v)),
      });
      cssState = EditorState.create({
        doc: nextCss,
        extensions: baseExtensions(css(), (v) => onChangeCss(v)),
      });
      if (darkExt) {
        contentState = contentState.update({ effects: themeCompartment.reconfigure(darkExt) }).state;
        cssState = cssState.update({ effects: themeCompartment.reconfigure(darkExt) }).state;
      }
      view.setState(activeTab === 'content' ? contentState : cssState);
    } finally {
      suppressChange = false;
    }
  }

  function replaceContentOnly(nextContent) {
    suppressChange = true;
    try {
      if (activeTab === 'content') {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: nextContent },
        });
      } else {
        contentState = contentState.update({
          changes: { from: 0, to: contentState.doc.length, insert: nextContent },
        }).state;
      }
    } finally {
      suppressChange = false;
    }
  }

  function replaceCssOnly(nextCss) {
    suppressChange = true;
    try {
      if (activeTab === 'css') {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: nextCss },
        });
      } else {
        cssState = cssState.update({
          changes: { from: 0, to: cssState.doc.length, insert: nextCss },
        }).state;
      }
    } finally {
      suppressChange = false;
    }
  }

  function ensureMarkdownTab() {
    if (typeof onRequestMarkdownTab === 'function') {
      onRequestMarkdownTab();
    } else if (activeTab !== 'content') {
      switchTab('content');
    }
  }

  function wrapSelection(before, after = before, placeholder = 'text') {
    ensureMarkdownTab();
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to) || placeholder;
    const inserted = `${before}${selected}${after}`;
    view.dispatch({
      changes: { from, to, insert: inserted },
      selection: { anchor: from + before.length, head: from + before.length + selected.length },
    });
    view.focus();
  }

  function setLinePrefix(prefix, stripRegex = /^#{1,6}\s+/) {
    ensureMarkdownTab();
    const { from, to } = view.state.selection.main;
    const startLine = view.state.doc.lineAt(from);
    const endLine = view.state.doc.lineAt(to);
    const changes = [];
    for (let ln = startLine.number; ln <= endLine.number; ln++) {
      const line = view.state.doc.line(ln);
      const stripped = line.text.replace(stripRegex, '');
      const nextText = prefix ? `${prefix}${stripped}` : stripped;
      changes.push({ from: line.from, to: line.to, insert: nextText });
    }
    view.dispatch({ changes });
    view.focus();
  }

  function insertBlock(blockText) {
    ensureMarkdownTab();
    let { from, to } = view.state.selection.main;
    // Never break YAML front-matter at the top of content.md when cursor is at pos 0 or inside ---...---
    const docText = view.state.doc.toString();
    const fmMatch = docText.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
    if (fmMatch && from < fmMatch[0].length) {
      from = fmMatch[0].length;
      to = Math.max(to, from);
    }
    const prefix = from > 0 && view.state.sliceDoc(from - 1, from) !== '\n' ? '\n\n' : '\n';
    const text = `${prefix}${blockText}\n`;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  }

  /**
   * Return the exact fractional 1-based line number currently at the top of the CodeMirror viewport.
   */
  function getTopVisibleLine() {
    const scrollTop = view.scrollDOM.scrollTop;
    const block = view.lineBlockAtHeight(scrollTop);
    const lineObj = view.state.doc.lineAt(block.from);
    const frac = block.height > 0 ? Math.min(1, Math.max(0, (scrollTop - block.top) / block.height)) : 0;
    return lineObj.number + frac;
  }

  /**
   * Return the CodeMirror scrollTop (px) corresponding to a fractional 1-based line number.
   */
  function getScrollTopForLine(exactLine) {
    const doc = view.state.doc;
    const clamped = Math.min(doc.lines, Math.max(1, exactLine));
    const baseNum = Math.floor(clamped);
    const frac = clamped - baseNum;
    const lineObj = doc.line(baseNum);
    const block = view.lineBlockAt(lineObj.from);
    return block.top + frac * block.height;
  }

  return {
    view,
    getActiveTab: () => activeTab,
    switchTab,
    setTheme,
    replaceDocuments,
    replaceContentOnly,
    replaceCssOnly,
    wrapSelection,
    setLinePrefix,
    insertBlock,
    getTopVisibleLine,
    getScrollTopForLine,
    undo: () => { undo(view); view.focus(); },
    redo: () => { redo(view); view.focus(); },
    selectAll: () => { selectAll(view); view.focus(); },
    openSearch: () => { openSearchPanel(view); },
    focus: () => view.focus(),
  };
}

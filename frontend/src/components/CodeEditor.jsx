// ============================================================================
// CodeEditor.jsx - Monaco Code Editor Component
// ============================================================================
// Wraps Monaco Editor (the engine behind VS Code) to provide a full-featured
// code editing experience with syntax highlighting, bracket matching, and
// smooth animations. Code state is managed by the parent (IDE.jsx).
// ============================================================================

import React from "react";
import Editor from "@monaco-editor/react";

const CodeEditor = ({ code, setCode, language = "cpp" }) => {
  // Define custom high-fidelity black theme
  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme('codespace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#050505',
        'editor.lineHighlightBackground': '#141414',
        'editorLineNumber.foreground': '#3f3f46',
        'editorLineNumber.activeForeground': '#a1a1aa',
        'editor.selectionBackground': '#2563eb33',
        'editor.inactiveSelectionBackground': '#2563eb11',
      }
    });
  };

  // Editor settings configured to feel premium and VS Code-like
  const editorOptions = {
    fontSize: 16,
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    minimap: { enabled: false },           // hide minimap for a cleaner look
    scrollBeyondLastLine: false,           // prevent scrolling past the last line
    automaticLayout: true,                 // auto-resize when container changes
    padding: { top: 16, bottom: 16 },
    cursorSmoothCaretAnimation: "on",
    cursorBlinking: "expand",
    formatOnPaste: true,                   // auto-format pasted code
    lineHeight: 24,
    bracketPairColorization: { enabled: true }, // colorize matching brackets
    smoothScrolling: true,
  };

  // Updates parent's code state on every keystroke
  const handleEditorChange = (value) => {
    setCode(value);
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height="100%"
        theme="codespace-dark"
        beforeMount={handleEditorWillMount}
        defaultLanguage={language}
        defaultValue={code}
        onChange={handleEditorChange}
        options={editorOptions}
        loading={<div className="text-zinc-500 p-8 font-black uppercase text-[10px] tracking-widest animate-pulse">Initializing Editor...</div>}
      />
    </div>
  );
};

export default CodeEditor;
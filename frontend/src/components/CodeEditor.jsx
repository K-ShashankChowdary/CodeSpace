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
  };

  // Updates parent's code state on every keystroke
  const handleEditorChange = (value) => {
    setCode(value);
  };

  return (
    <div className="h-full w-full border border-[#3e3e3e] rounded-lg overflow-hidden shadow-2xl">
      <Editor
        height="100%"
        theme="vs-dark"
        defaultLanguage={language}
        defaultValue={code}
        onChange={handleEditorChange}
        options={editorOptions}
        loading={<div className="text-gray-400 p-4">Initializing Editor...</div>}
      />
    </div>
  );
};

export default CodeEditor;
import React from "react";
import Editor from "@monaco-editor/react";

const CodeEditor = ({ code, setCode, language = "cpp" }) => {
  
  // Customizing the editor's appearance and behavior
  const editorOptions = {
    fontSize: 16,
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    minimap: { enabled: false }, // Disabling minimap for a cleaner look
    scrollBeyondLastLine: false,
    automaticLayout: true, // Auto-resizes when the container changes
    padding: { top: 16, bottom: 16 },
    cursorSmoothCaretAnimation: "on",
    cursorBlinking: "expand",
    formatOnPaste: true,
    lineHeight: 24,
    bracketPairColorization: { enabled: true },
  };

  const handleEditorChange = (value) => {
    setCode(value);
  };

  return (
    <div className="h-full w-full border border-[#3e3e3e] rounded-lg overflow-hidden shadow-2xl">
      <Editor
        height="100%"
        theme="vs-dark" // VS Code Dark Theme
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
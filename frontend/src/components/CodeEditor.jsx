import React from "react";
import Editor from "@monaco-editor/react";

const CodeEditor = ({ code, setCode, language = "cpp" }) => {
  // I am setting up the editor options to make it look clean and behave like VS Code
  const editorOptions = {
    fontSize: 16,
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 16, bottom: 16 },
    cursorSmoothCaretAnimation: "on",
    cursorBlinking: "expand",
    formatOnPaste: true,
    lineHeight: 24,
    bracketPairColorization: { enabled: true },
  };

  const handleEditorChange = (value) => {
    // I update the parent component's state whenever the user types
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
import { useState, useEffect, useRef } from "react";

export const BOILERPLATES = {
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}`,
  python: `def solve():\n    # Write your code here\n    \n    pass\n\nif __name__ == '__main__':\n    solve()`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n        \n    }\n}`,
  javascript: `function solve() {\n    // Write your code here\n    \n}\n\nsolve();`
};

export const useIDEState = (problemId) => {
  const [activeTab, setActiveTab] = useState("description");
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("codespace-lastLang") || "cpp";
  });

  useEffect(() => {
    localStorage.setItem("codespace-lastLang", language);
  }, [language]);

  const [code, setCode] = useState(() => {
    if (!problemId) return BOILERPLATES["cpp"];
    return localStorage.getItem(`codespace-${problemId}-${language}`) || BOILERPLATES[language] || BOILERPLATES["cpp"];
  });

  useEffect(() => {
    if (code && problemId) {
      localStorage.setItem(`codespace-${problemId}-${language}`, code);
    }
  }, [code, language, problemId]);

  return {
    activeTab,
    setActiveTab,
    activeTabRef,
    language,
    setLanguage,
    code,
    setCode,
  };
};

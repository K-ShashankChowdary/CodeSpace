import React, { useState } from 'react';
import CodeEditor from './components/CodeEditor';

function App() {
  const [code, setCode] = useState(
    `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Day 4: Monaco Integration\n    cout << "Editor is Live!" << endl;\n    return 0;\n}`
  );

  return (
    <div className="h-screen w-screen bg-[#121212] p-8 flex flex-col gap-4">
      <header className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">CodeSpace <span className="text-blue-500 text-sm">Playground</span></h1>
        <div className="text-gray-500 text-xs font-mono">Language: C++ (v17)</div>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <CodeEditor code={code} setCode={setCode} />
      </div>

      <footer className="py-2 px-4 bg-[#1e1e1e] rounded border border-[#333] flex justify-between items-center">
        <span className="text-gray-400 text-xs italic">Characters: {code.length}</span>
        <button 
          onClick={() => console.log("Final Code:", code)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 rounded font-semibold text-sm transition-all shadow-lg active:scale-95"
        >
          Capture Code
        </button>
      </footer>
    </div>
  );
}

export default App;
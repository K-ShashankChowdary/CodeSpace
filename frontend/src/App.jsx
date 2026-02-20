import React, { useState, useRef } from 'react';
import axios from 'axios';
import CodeEditor from './components/CodeEditor';

function App() {
  const [code, setCode] = useState(
    `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b;\n    return 0;\n}`
  );
  
  // I need to store the execution output and track the submission status
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('Idle');
  const [isLoading, setIsLoading] = useState(false);
  
  // I use a ref to hold the interval ID so I can clear it without triggering re-renders
  const pollingIntervalRef = useRef(null);

  // I am hardcoding the problem ID from my database seed for testing
  const PROBLEM_ID = "6998822092eb5ea77d4f1448"; 

  const handleRunCode = async () => {
    if (!code.trim()) return;

    setIsLoading(true);
    setStatus('Queued');
    setOutput('Sending to server...');

    try {
      // I send the code to my Express backend to be placed in the Redis queue
      const response = await axios.post('http://localhost:5000/api/v1/submissions/submit', {
        problemId: PROBLEM_ID,
        language: 'cpp',
        code: code
      });

      const jobId = response.data.data.jobId;
      pollJobStatus(jobId);
    } catch (error) {
      console.error(error);
      setStatus('System Error');
      setOutput(error.response?.data?.message || 'Failed to connect to backend.');
      setIsLoading(false);
    }
  };

  const pollJobStatus = (jobId) => {
    // I make sure to clear any old intervals before starting a new polling loop
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        // I fetch the latest status from my database via the API
        const response = await axios.get(`http://localhost:5000/api/v1/submissions/status/${jobId}`);
        const jobData = response.data.data;

        if (jobData.status !== 'Pending') {
          // The worker finished executing, so I stop polling and update the UI
          clearInterval(pollingIntervalRef.current);
          setStatus(jobData.status);
          setOutput(jobData.output || 'No output generated.');
          setIsLoading(false);
        } else {
          setStatus('Executing...');
        }
      } catch (error) {
        console.error(error);
        clearInterval(pollingIntervalRef.current);
        setStatus('Polling Error');
        setOutput('Lost connection to execution engine.');
        setIsLoading(false);
      }
    }, 1500);
  };

  // I use this function to dynamically style the status badge based on the result
  const getStatusColor = () => {
    if (status === 'AC') return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (['WA', 'TLE', 'RE', 'MLE', 'CE'].includes(status)) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (status === 'Executing...' || status === 'Queued') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-gray-400 bg-gray-800 border-gray-700';
  };

  return (
    <div className="h-screen w-screen bg-[#121212] p-6 flex flex-col gap-4 font-sans text-gray-200">
      <header className="flex justify-between items-center border-b border-[#333] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CodeSpace</h1>
          <p className="text-gray-500 text-sm mt-1">Sum of Two Numbers</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded border text-sm font-semibold tracking-wide ${getStatusColor()}`}>
            {status}
          </div>
          <button 
            onClick={handleRunCode}
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded font-bold text-sm transition-all shadow-md"
          >
            {isLoading ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        <div className="w-full lg:w-1/3 bg-[#1e1e1e] border border-[#333] rounded-lg p-6 overflow-y-auto custom-scrollbar">
          <h2 className="text-lg font-bold text-white mb-4">Description</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Given two integers <code>a</code> and <code>b</code>, output their sum.
          </p>
          <div className="bg-[#121212] border border-[#333] p-4 rounded mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Input</h3>
            <code className="text-sm text-green-400">10 20</code>
          </div>
          <div className="bg-[#121212] border border-[#333] p-4 rounded">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Expected Output</h3>
            <code className="text-sm text-green-400">30</code>
          </div>
        </div>

        <div className="w-full lg:w-2/3 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 min-h-[400px]">
            <CodeEditor code={code} setCode={setCode} />
          </div>
          
          <div className="h-1/3 min-h-[200px] bg-[#1e1e1e] border border-[#333] rounded-lg flex flex-col">
            <div className="bg-[#252525] border-b border-[#333] px-4 py-2 flex justify-between items-center rounded-t-lg">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Console Output</span>
            </div>
            <pre className="flex-1 p-4 font-mono text-sm text-gray-300 overflow-auto whitespace-pre-wrap custom-scrollbar">
              {output || "Run code to see output..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
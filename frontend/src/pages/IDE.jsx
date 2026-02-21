import React, { useState, useRef } from 'react';
import axios from 'axios';
import CodeEditor from '../components/CodeEditor';

function IDE() {
  const [code, setCode] = useState(
    `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b;\n    return 0;\n}`
  );
  
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('Idle');
  const [isLoading, setIsLoading] = useState(false);
  
  const pollingIntervalRef = useRef(null);
  const PROBLEM_ID = "6998822092eb5ea77d4f1448"; 

  const handleLogout = async () => {
    try {
      // I post to the logout endpoint to clear the HTTP-only JWT cookies
      await axios.post('http://localhost:5000/api/v1/users/logout');
      
      // I force a hard reload to clear React state and redirect to the auth page safely
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const handleRunCode = async () => {
    if (!code.trim()) return;

    setIsLoading(true);
    setStatus('Queued');
    setOutput('Sending to server...');

    try {
      // I send the user code to the backend for execution queue placement
      const response = await axios.post('http://localhost:5000/api/v1/submissions/submit', {
        problemId: PROBLEM_ID,
        language: 'cpp',
        code: code
      });

      const jobId = response.data.data.jobId;
      pollJobStatus(jobId);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401) {
        // I force a hard reload if the token expired during an active session
        window.location.href = '/auth';
      } else {
        setStatus('System Error');
        setOutput(error.response?.data?.message || 'Failed to connect to backend.');
      }
      setIsLoading(false);
    }
  };

  const pollJobStatus = (jobId) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/v1/submissions/status/${jobId}`);
        const jobData = response.data.data;

        if (jobData.status !== 'Pending') {
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

  const getStatusColor = () => {
    if (status === 'AC') return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (['WA', 'TLE', 'RE', 'MLE', 'CE'].includes(status)) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (status === 'Executing...' || status === 'Queued') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-gray-400 bg-[#1e1e1e] border-[#333]';
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] p-4 md:p-6 flex flex-col gap-4 font-sans text-gray-200">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#121212] border border-[#2a2a2a] p-4 rounded-xl shadow-sm">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">CodeSpace</h1>
          <p className="text-gray-500 text-sm mt-0.5 font-medium">Sum of Two Numbers</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className={`px-4 py-1.5 rounded-lg border text-sm font-bold tracking-wide shadow-sm flex-1 sm:flex-none text-center transition-colors duration-300 ${getStatusColor()}`}>
            {status}
          </div>
          <button 
            onClick={handleRunCode}
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-md shadow-blue-900/20"
          >
            {isLoading ? 'Running...' : 'Run Code'}
          </button>
          <button 
            onClick={handleLogout}
            className="bg-[#1e1e1e] border border-[#333] text-gray-300 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm"
          >
            Logout
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        <div className="w-full lg:w-1/3 bg-[#121212] border border-[#2a2a2a] rounded-xl p-6 overflow-y-auto custom-scrollbar shadow-sm">
          <h2 className="text-lg font-bold text-white mb-3">Description</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Given two integers <code className="bg-[#1e1e1e] text-gray-200 px-1.5 py-0.5 rounded border border-[#333] font-mono text-xs">a</code> and <code className="bg-[#1e1e1e] text-gray-200 px-1.5 py-0.5 rounded border border-[#333] font-mono text-xs">b</code>, output their sum.
          </p>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-4 rounded-lg mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Input</h3>
            <code className="text-sm text-gray-300 font-mono">10 20</code>
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-4 rounded-lg">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Expected Output</h3>
            <code className="text-sm text-gray-300 font-mono">30</code>
          </div>
        </div>

        <div className="w-full lg:w-2/3 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 min-h-[300px] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-sm">
            <CodeEditor code={code} setCode={setCode} />
          </div>
          
          <div className="h-1/3 min-h-[200px] bg-[#121212] border border-[#2a2a2a] rounded-xl flex flex-col shadow-sm">
            <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-5 py-3 flex justify-between items-center rounded-t-xl">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                Console Output
              </span>
            </div>
            <pre className="flex-1 p-5 font-mono text-sm text-gray-300 overflow-auto whitespace-pre-wrap custom-scrollbar">
              {output || "Run code to see output..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IDE;
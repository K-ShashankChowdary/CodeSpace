import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        console.log("[Dashboard] Initiating GET request to /api/v1/problems...");
        const response = await axios.get('http://localhost:5000/api/v1/problems');
        console.log("[Dashboard] Successfully received data:", response.data);
        setProblems(response.data.data);
      } catch (err) {
        console.error("----- FRONTEND AXIOS CRASH -----");
        console.error("1. Full Error Object:", err);
        console.error("2. Error Response (from backend):", err.response);
        console.error("3. Error Request (sent to backend):", err.request);
        console.error("4. Error Message:", err.message);
        console.error("--------------------------------");

        const errorMessage = err.response?.data?.message || err.message;
        const statusCode = err.response?.status || "Network Error";
        setError(`Failed to load problems. [${statusCode}]: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const getDifficultyColor = (difficulty) => {
    if (difficulty === 'Easy') return 'text-green-400';
    if (difficulty === 'Medium') return 'text-yellow-400';
    if (difficulty === 'Hard') return 'text-red-400';
    return 'text-gray-400';
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/v1/users/logout');
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (isLoading) {
    return <div className="h-screen w-screen bg-[#0a0a0a] text-white flex items-center justify-center">Loading problems...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-gray-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10 border-b border-[#2a2a2a] pb-4">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Problem Set</h1>
          <button 
            onClick={handleLogout}
            className="border border-red-500/50 text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg font-bold text-sm transition-all"
          >
            Logout
          </button>
        </header>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 font-mono text-sm">{error}</div>}

        <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Title</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-32">Difficulty</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-32 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <tr key={problem._id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                  <td className="p-4 text-sm font-medium text-white">{problem.title}</td>
                  <td className={`p-4 text-sm font-bold ${getDifficultyColor(problem.difficulty)}`}>
                    {problem.difficulty}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => navigate(`/problem/${problem._id}`)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors"
                    >
                      Solve
                    </button>
                  </td>
                </tr>
              ))}
              {problems.length === 0 && !error && (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-gray-500">No problems found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
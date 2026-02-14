/**
 * CODESPACE ENGINE - CORE LOGIC
 * Author: Shashank Chowdary
 * * * WHAT THIS DOES:
 * 1. Receives a file path from the Node.js worker.
 * 2. Spins up a secure Docker container (GCC image).
 * 3. Compiles and Runs the code in a single step for speed.
 * 4. Captures stdout/stderr, stripping system noise.
 * 5. Returns a clean, parsed JSON object that won't crash the backend.
 * * * CRITICAL CONSTRAINTS:
 * - Time: 4s Hard Limit (Docker takes ~1-2s to boot on Mac, so user gets ~2s).
 * - Memory: 256MB Hard Limit.
 * - Swap: DISABLED (Set equal to memory limit). If we don't do this, 
 * Mac OS will swap the container to disk, causing the Mac to freeze 
 * instead of killing the process.
 * - Net: NONE. No internet access for the container.
 */

#include <iostream>
#include <cstdio>
#include <string>
#include <array>
#include <filesystem>
#include <chrono>
#include <sys/wait.h>

namespace fs = std::filesystem;
using namespace std;
using namespace std::chrono;

// --- CONFIGURATION ---
const string IMAGE = "gcc:latest";
const int MAX_OUTPUT_SIZE = 10000;      // 10KB cap. Prevents "Output Limit Exceeded" spam.
const string TIME_LIMIT_FLAG = "4s";    // Docker kill switch.
const int TIME_THRESHOLD_MS = 3800;     // Logic cutoff: >3.8s is TLE, <3.8s crash is MLE/RE.
const string MEM_LIMIT = "256m";
const string PID_LIMIT = "64";          // Prevents fork bombs from spawning infinite threads.

// Mac uses 'gtimeout', Linux uses 'timeout'. Detect at compile time.
#ifdef __APPLE__
    const string TIMEOUT_CMD = "/opt/homebrew/bin/gtimeout -k 1s"; 
#else
    const string TIMEOUT_CMD = "timeout -k 1s"; 
#endif

struct ExecutionResult {
    string output;
    int exit_code;
    string status;
    long time_ms;
};

/**
 * SANITIZER:
 * Raw C++ output contains characters that break JSON (quotes, newlines, tabs).
 * We manually escape them so Node.js doesn't throw a syntax error.
 */
string json_escape(const string& input) {
    string output = "";
    for (char c : input) {
        if (c == '\"') output += "\\\"";
        else if (c == '\\') output += "\\\\";
        else if (c == '\n') output += "\\n";
        else if (c == '\t') output += "\\t"; // Preserve tab formatting
        else if (c == '\r') continue;        // Windows style \r is useless here
        else if (c >= 32 && c <= 126) output += c; // Only keep printable ASCII
    }
    return output;
}

class DockerBridge {
public:
    static ExecutionResult run(const fs::path& path) {
        // BUILD COMMAND:
        // 1. --network none: Security. User cannot download malware or hit API.
        // 2. --memory-swap: Crucial. Must match --memory to force OOM Kill.
        // 3. -v: Volume mount. We maps the host temp dir to /app container dir.
        // 4. 2>&1: Redirect stderr (compiler errors) to stdout so we capture it.
        string cmd = TIMEOUT_CMD + " " + TIME_LIMIT_FLAG + " docker run --rm -v \"" + 
                     path.parent_path().string() + ":/app\" --network none " +
                     "--memory=\"" + MEM_LIMIT + "\" --memory-swap=\"" + MEM_LIMIT + "\" " +
                     "--pids-limit=" + PID_LIMIT + " -w /app " + IMAGE + 
                     " /bin/sh -c \"g++ -O2 " + path.filename().string() + " -o r && ./r\" 2>&1";

        auto start = high_resolution_clock::now();
        FILE* pipe = popen(cmd.c_str(), "r");
        
        if (!pipe) throw runtime_error("FATAL: Failed to open pipe to Docker.");

        string raw_out;
        array<char, 128> buf;
        
        // READ OUTPUT:
        while (fgets(buf.data(), buf.size(), pipe)) {
            string line = buf.data();
            
            // NOISE FILTER:
            // Docker and the Shell sometimes print "Killed" or "Terminated" to stdout.
            // We strip these lines because they confuse the user (and the JSON parser).
            if (line.find("Killed") == string::npos && 
                line.find("gtimeout") == string::npos && 
                raw_out.size() < MAX_OUTPUT_SIZE) {
                raw_out += line;
            }
        }

        // MAC FIX:
        // 'pclose' returns the exit status. On Mac, WEXITSTATUS is a macro that
        // fails if passed a function call directly (rvalue address error).
        // We store it in a variable first.
        int pclose_status = pclose(pipe);
        int exit_code = WEXITSTATUS(pclose_status); 

        auto end = high_resolution_clock::now();
        long duration = duration_cast<milliseconds>(end - start).count();

        // VERDICT LOGIC:
        string status = "AC";
        
        // 124 = Timeout command triggered.
        // 137 = SIGKILL (Out of Memory OR Timeout hard kill).
        if (exit_code == 124 || (exit_code == 137 && duration > TIME_THRESHOLD_MS)) {
            status = "TLE";
        } 
        // If it died with 137 but was FAST, it ran out of memory (OOM).
        else if (exit_code == 137) {
            status = "MLE";
        } 
        // Any other non-zero code is a crash or compilation error.
        else if (exit_code != 0) {
            // Heuristic: If gcc output contains "error:", it failed to compile.
            // Otherwise, the program started but crashed (Segfault, Div/0).
            status = (raw_out.find("error:") != string::npos) ? "CE" : "RE";
        }

        return {raw_out, exit_code, status, duration};
    }
};

int main(int argc, char* argv[]) {
    // FAIL FAST:
    if (argc < 2) {
        cout << "{\"status\":\"RE\",\"error\":\"INTERNAL: No file provided to Executor\"}" << endl;
        return 1;
    }

    try {
        // EXECUTE:
        auto res = DockerBridge::run(fs::absolute(argv[1]));
        
        // RETURN JSON:
        // We construct the JSON manually to avoid heavy external libraries.
        cout << "{"
             << "\"status\":\"" << res.status << "\","
             << "\"time_ms\":" << res.time_ms << ","
             << "\"exit_code\":" << res.exit_code << ","
             << "\"output\":\"" << json_escape(res.output) << "\""
             << "}" << endl;
             
    } catch (...) {
        // EMERGENCY CATCH:
        cout << "{\"status\":\"RE\",\"error\":\"INTERNAL: Engine Crashed Unexpectadly\"}" << endl;
    }

    return 0;
}
#include <iostream>
#include <cstdio>
#include <string>
#include <array>
#include <filesystem>
#include <chrono>
#include <sys/wait.h>
#include <csignal>

namespace fs = std::filesystem;
using namespace std;
using namespace std::chrono;

/**
 * --- THE IRON-CLAD CONFIGURATION ---
 * IMAGE: The isolated sandbox.
 * MAX_OUTPUT_SIZE: Prevents "Output Limit Exceeded" memory attacks.
 * MEM_LIMIT: Hard RAM cap. Set equal to swap to prevent Mac disk thrashing.
 * CPU_LIMIT: 0.5 means the container can only use 50% of one core.
 * PID_LIMIT: Prevents fork bombs from crashing the host.
 * TIME_LIMIT: Hard wall-clock limit.
 */
const string IMAGE = "cpp-runner";
const int MAX_OUTPUT_SIZE = 10000;   // 10KB
const string MEM_LIMIT = "256m";     
const string CPU_LIMIT = "0.5";      
const string PID_LIMIT = "64";       
const string TIME_LIMIT = "4s";      
const int THRESHOLD_MS = 3800;       // Buffer to distinguish TLE from RE

// Global for signal cleanup
FILE* current_pipe = nullptr;

/**
 * CLEANUP HANDLER
 * Ensures that if the C++ engine is killed, the pipe to the shell is closed.
 */
void cleanup(int signum) {
    if (current_pipe) pclose(current_pipe);
    exit(signum);
}

string json_escape(const string &input) {
    string output = "";
    for (char c : input) {
        if (c == '\"') output += "\\\"";
        else if (c == '\\') output += "\\\\";
        else if (c == '\n') output += "\\n";
        else if (c == '\t') output += "\\t";
        else if (c >= 32 && c <= 126) output += c;
    }
    return output;
}

int main(int argc, char *argv[]) {
    signal(SIGINT, cleanup);
    signal(SIGTERM, cleanup);

    if (argc < 2) {
        cout << "{\"status\":\"RE\",\"output\":\"INTERNAL: No file provided\"}" << endl;
        return 1;
    }

    try {
        fs::path codePath = fs::absolute(argv[1]);
        fs::path inputPath = (argc >= 3) ? fs::absolute(argv[2]) : "";
        
        string timeoutCmd = "gtimeout"; // Change to 'timeout' if on Linux
        string runCmd = "./r";
        if (!inputPath.empty()) runCmd += " < input.txt";

        /**
         * THE STRICT EXECUTION COMMAND:
         * 1. --init: Acts as a tiny init system to reap zombie children (PID 1).
         * 2. --cpus: Hard limit on CPU hardware cycles.
         * 3. --stop-timeout: Forces SIGKILL 1s after the process hangs.
         * 4. --network none: Total isolation from the internet.
         * 5. --memory-swap: Set equal to --memory to force OOM-Kill instead of swapping.
         */
        string cmd = timeoutCmd + " -k 1s " + TIME_LIMIT + " docker run --rm --init " +
                     "--cpus=\"" + CPU_LIMIT + "\" " +
                     "--stop-timeout 1 " +
                     "-v \"" + codePath.parent_path().string() + ":/app\" " +
                     "--network none --memory=\"" + MEM_LIMIT + "\" " +
                     "--memory-swap=\"" + MEM_LIMIT + "\" --pids-limit=" + PID_LIMIT + 
                     " -w /app " + IMAGE + " /bin/sh -c \"g++ -O2 " + 
                     codePath.filename().string() + " -o r && " + runCmd + "\" 2>&1";

        auto start = high_resolution_clock::now();
        current_pipe = popen(cmd.c_str(), "r");
        
        if (!current_pipe) throw runtime_error("Pipe failed");

        string raw_out;
        array<char, 128> buf;
        while (fgets(buf.data(), buf.size(), current_pipe)) {
            if (raw_out.size() < MAX_OUTPUT_SIZE) raw_out += buf.data();
        }

        int pclose_status = pclose(current_pipe);
        current_pipe = nullptr; 
        
        int exit_code = WEXITSTATUS(pclose_status);
        auto end = high_resolution_clock::now();
        long duration = duration_cast<milliseconds>(end - start).count();

        // --- VERDICT LOGIC ---
        string status = "AC";
        
        // 124 = gtimeout kill. 137 = SIGKILL (OOM or hard-kill).
        if (exit_code == 124 || (exit_code == 137 && duration > THRESHOLD_MS)) {
            status = "TLE";
        } else if (exit_code == 137) {
            status = "MLE";
        } else if (exit_code != 0) {
            status = (raw_out.find("error:") != string::npos) ? "CE" : "RE";
        }

        // --- JSON RESPONSE ---
        cout << "{"
             << "\"status\":\"" << status << "\","
             << "\"time_ms\":" << duration << ","
             << "\"output\":\"" << json_escape(raw_out) << "\""
             << "}" << endl;

    } catch (...) {
        cout << "{\"status\":\"RE\",\"output\":\"INTERNAL: Engine Exception\"}" << endl;
    }
    return 0;
}
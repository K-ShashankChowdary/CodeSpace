#include <iostream>
#include <cstdio>
#include <string>
#include <array>
#include <filesystem>
#include <chrono>
#include <sys/wait.h>
#include <csignal>
#include <vector>

namespace fs = std::filesystem;
using namespace std;
using namespace std::chrono;

/**
 * My Container Configuration
 * I defined these constants to strictly limit what the user code can do.
 * * IMAGE: The isolated sandbox environment (my Docker image).
 * MAX_OUTPUT_SIZE: I limit this to 10KB to prevent memory attacks via massive stdout spam.
 * MEM_LIMIT: Hard RAM cap. I set this equal to swap to strictly kill processes that exceed it.
 * CPU_LIMIT: 0.5 means the container gets 50% of a single core.
 * PID_LIMIT: I set this to 64 to prevent fork bombs from crashing my host machine.
 * TIME_LIMIT: The hard wall-clock limit for the entire execution.
 */
const string IMAGE = "cpp-runner";
const int MAX_OUTPUT_SIZE = 10000;   
const string MEM_LIMIT = "256m";     
const string CPU_LIMIT = "0.5";      
const string PID_LIMIT = "64";       
const string TIME_LIMIT = "4s";      
const int THRESHOLD_MS = 3800;       // I use this buffer to differentiate between a strict Timeout and a Runtime hang.

// I need a global file pointer here so my cleanup handler can access it
FILE* current_pipe = nullptr;

/**
 * Signal Handler
 * If my executor gets killed (SIGINT/SIGTERM), I need to ensure the pipe 
 * to the shell is closed properly to avoid zombie processes.
 */
void cleanup(int signum) {
    if (current_pipe) pclose(current_pipe);
    exit(signum);
}

// Helper to escape special characters for valid JSON output
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
    // I register my signal handlers immediately
    signal(SIGINT, cleanup);
    signal(SIGTERM, cleanup);

    // I expect the Job ID to be passed as the first argument
    if (argc < 2) {
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: No Job ID provided\"}" << endl;
        return 1;
    }

    try {
        // --- Path Resolution Logic ---
        // The Worker only gives me the Job ID (e.g. "6993..."). 
        // I need to manually construct the absolute paths because I am running from the backend root.
        string jobId = argv[1];
        
        // I resolve 'temp' relative to where I am executed (backend/)
        fs::path tempDir = fs::absolute("temp"); 
        fs::path codePath = tempDir / (jobId + ".cpp");
        fs::path inputPath = tempDir / (jobId + ".txt");
        
        // Since I'm on Mac, I use 'gtimeout'. I'll change this to 'timeout' when I deploy to Linux.
        string timeoutCmd = "gtimeout"; 
        
        // Inside the container, I mount the host's 'temp' to '/app'.
        // So I compile the file (named after the ID) and run the output binary.
        string dockerRunCmd = "./r";
        
        // I only redirect stdin if the input file actually exists
        if (fs::exists(inputPath)) {
            dockerRunCmd += " < " + jobId + ".txt";
        }

        /**
         * My Execution Command Construction:
         * 1. --init: I use this to reap zombie processes inside the container.
         * 2. --cpus: I enforce the hardware CPU limit.
         * 3. --stop-timeout: I force Docker to kill the container 1s after the timeout command triggers.
         * 4. --network none: I disable all networking for security.
         * 5. -v: This is the critical part where I map my host temp dir to the container.
         */
        string cmd = timeoutCmd + " -k 1s " + TIME_LIMIT + " docker run --rm --init " +
                     "--cpus=\"" + CPU_LIMIT + "\" " +
                     "--stop-timeout 1 " +
                     "-v \"" + tempDir.string() + ":/app\" " +
                     "--network none --memory=\"" + MEM_LIMIT + "\" " +
                     "--memory-swap=\"" + MEM_LIMIT + "\" --pids-limit=" + PID_LIMIT + 
                     " -w /app " + IMAGE + " /bin/sh -c \"g++ -O2 " + 
                     jobId + ".cpp -o r && " + dockerRunCmd + "\" 2>&1";

        auto start = high_resolution_clock::now();
        
        // I execute the command and open a pipe to read its stdout
        current_pipe = popen(cmd.c_str(), "r");
        
        if (!current_pipe) throw runtime_error("Pipe failed");

        string raw_out;
        array<char, 128> buf;
        
        // I read the output in chunks, respecting my max output size limit
        while (fgets(buf.data(), buf.size(), current_pipe)) {
            if (raw_out.size() < MAX_OUTPUT_SIZE) raw_out += buf.data();
        }

        int pclose_status = pclose(current_pipe);
        current_pipe = nullptr; 
        
        // I extract the actual exit code from the process
        int exit_code = WEXITSTATUS(pclose_status);
        auto end = high_resolution_clock::now();
        long duration = duration_cast<milliseconds>(end - start).count();

        // --- Verdict Determination Logic ---
        string status = "AC";
        
        // 124 is the exit code for timeout. 137 is SIGKILL (usually OOM).
        if (exit_code == 124 || (exit_code == 137 && duration > THRESHOLD_MS)) {
            status = "TLE";
        } else if (exit_code == 137) {
            status = "MLE";
        } else if (exit_code != 0) {
            // I check for compiler errors by looking for standard gcc error keywords
            if (raw_out.find("error:") != string::npos || raw_out.find("fatal error:") != string::npos) {
                status = "CE";
            } else {
                status = "RE";
            }
        }

        // I print the final result as a clean JSON string for the Node.js worker to parse
        cout << "{"
             << "\"status\":\"" << status << "\","
             << "\"time_ms\":" << duration << ","
             << "\"output\":\"" << json_escape(raw_out) << "\""
             << "}" << endl;

    } catch (...) {
        // Catch-all for any internal engine crashes
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: Engine Exception\"}" << endl;
    }
    return 0;
}
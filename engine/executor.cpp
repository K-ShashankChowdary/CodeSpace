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
 * MEM_LIMIT: I set this to 256MB.
 * THRESHOLD_MS: I use 3500ms. If a process is killed (137) before this, it's MLE. After, it's TLE.
 */
const string IMAGE = "cpp-runner";
const int MAX_OUTPUT_SIZE = 10000;   
const string MEM_LIMIT = "256m";     
const string CPU_LIMIT = "0.5";      
const string PID_LIMIT = "64";       
const string TIME_LIMIT = "4s";      
const int THRESHOLD_MS = 3500;       

FILE* current_pipe = nullptr;

/**
 * Signal Handler
 * I need to ensure the pipe to the shell is closed if the executor itself is interrupted.
 */
void cleanup(int signum) {
    if (current_pipe) pclose(current_pipe);
    exit(signum);
}

// I use this to make sure stdout from the container doesn't break my JSON response
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

    // I now expect TWO arguments: Job ID and the Absolute Path to the temp directory
    if (argc < 3) {
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: Missing Job ID or Temp Path\"}" << endl;
        return 1;
    }

    try {
        string jobId = argv[1];
        string pathArg = argv[2]; 
        
        // I use the path provided by Node.js to avoid "No such file" errors
        fs::path tempDir(pathArg); 
        fs::path codePath = tempDir / (jobId + ".cpp");
        fs::path inputPath = tempDir / (jobId + ".txt");
        
        // I use gtimeout for Mac compatibility; I'll swap to 'timeout' on Linux later
        #ifdef __APPLE__
            string timeoutCmd = "gtimeout"; 
        #else
            string timeoutCmd = "timeout";
        #endif
        
        // I check if the input file exists on the host before telling Docker to use it
        string dockerRunCmd = "./r";
        if (fs::exists(inputPath)) {
            dockerRunCmd += " < " + jobId + ".txt";
        }

        /**
         * My Execution Command Construction:
         * I mount the host temp directory to /app and run the compiler + binary in one go.
         * I redirect 2>&1 so I can catch compilation errors and runtime crashes in the same buffer.
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

        // --- Verdict Determination Logic ---
        string status = "AC";
        
        // 124: gtimeout killed it.
        // 137: Docker/Kernel killed it (SIGKILL).
        if (exit_code == 124) {
            status = "TLE";
        } else if (exit_code == 137) {
            // If it died instantly (< 3.5s), it's OOM (MLE). Otherwise, it's a timeout.
            if (duration < THRESHOLD_MS) status = "MLE";
            else status = "TLE";
        } else if (exit_code != 0) {
            if (raw_out.find("error:") != string::npos || raw_out.find("fatal error:") != string::npos) {
                status = "CE";
            } else {
                status = "RE";
            }
        }

        // Final output for my Node.js worker
        cout << "{"
             << "\"status\":\"" << status << "\","
             << "\"time_ms\":" << duration << ","
             << "\"output\":\"" << json_escape(raw_out) << "\""
             << "}" << endl;

    } catch (...) {
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: Engine Exception\"}" << endl;
    }
    return 0;
}
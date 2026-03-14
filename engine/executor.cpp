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

// --- Configuration & Security Limits ---
const string IMAGE = "cpp-runner"; // Docker image containing g++
const int MAX_OUTPUT_SIZE = 10000; // Max bytes to read from stdout/stderr (10KB limit to prevent buffer overflow)
const string MEM_LIMIT = "256m";   // Strict 256MB RAM cap
const string CPU_LIMIT = "0.5";    // Throttle to 50% of a CPU core
const string PID_LIMIT = "64";     // Prevent fork bombs (e.g., while(1) fork();)
const string TIME_LIMIT = "10s";   // Hard kill switch for the container lifecycle
const int THRESHOLD_MS = 9500;     // Threshold to distinguish OOM (fast kill) vs TLE (slow kill)

// Global pointer for the pipe so the signal handler can clean it up
FILE *current_pipe = nullptr;

// Graceful cleanup on Ctrl+C or SIGTERM
void cleanup(int signum)
{
    if (current_pipe)
        pclose(current_pipe);
    exit(signum);
}

// Safely escapes stdout/stderr so it doesn't break the JSON response sent to Node.js
string json_escape(const string &input)
{
    if (input.empty())
        return ""; // Optimization: skip empty strings
    string output = "";
    for (char c : input)
    {
        if (c == '\"')
            output += "\\\"";
        else if (c == '\\')
            output += "\\\\";
        else if (c == '\n')
            output += "\\n";
        else if (c == '\t')
            output += "\\t";
        else if (c >= 32 && c <= 126)
            output += c;
    }
    return output;
}

// Node.js worker spawns this with: ./executor <jobId> <tempDirPath>
int main(int argc, char *argv[])
{
    // Register signal handlers for safe shutdown
    signal(SIGINT, cleanup);
    signal(SIGTERM, cleanup);

    if (argc < 3)
    {
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: Missing Job ID or Temp Path\"}" << endl;
        return 1;
    }

    try
    {
        string jobId = argv[1];   // MongoDB submission _id
        string pathArg = argv[2]; // absolute path to temp dir with .cpp and .txt files

        fs::path tempDir(pathArg);
        fs::path codePath = tempDir / (jobId + ".cpp");
        fs::path inputPath = tempDir / (jobId + ".txt");

// macOS uses 'gtimeout', Linux uses standard 'timeout'
#ifdef __APPLE__
        string timeoutCmd = "gtimeout";
#else
        string timeoutCmd = "timeout";
#endif

        string exeName = "r_" + jobId;
        string timeFileName = "time_" + jobId + ".txt";

        // --- The Execution Command ---
        // 1. Record start time in nanoseconds.
        // 2. Run the compiled binary (piping input if it exists).
        // 3. Capture the exit code.
        // 4. Record end time and calculate execution duration in milliseconds.
        // 5. Save the duration to a text file for accurate internal timing.
        string dockerRunCmd = "( start=$(date +%s%N); ./" + exeName;
        if (fs::exists(inputPath))
        {
            dockerRunCmd += " < " + jobId + ".txt";
        }
        // compute in milliseconds using nanoseconds scaled down
        dockerRunCmd += "; exit_code=$?; end=$(date +%s%N); echo $(((end - start) / 1000000)) > " + timeFileName + "; exit $exit_code; )";

        // build the docker run command with all security flags:
        // --rm (auto-cleanup), --network none (no internet), --memory (RAM cap),
        // --memory-swap (disable swap), --pids-limit (fork bomb protection),
        // 2>&1 (capture both stdout and stderr)
        string cmd = timeoutCmd + " -k 1s " + TIME_LIMIT + " docker run --rm --init " +
                     "--cpus=\"" + CPU_LIMIT + "\" " +
                     "--stop-timeout 1 " +
                     "-v \"" + tempDir.string() + ":/app\" " +
                     "--network none --memory=\"" + MEM_LIMIT + "\" " +
                     "--memory-swap=\"" + MEM_LIMIT + "\" --pids-limit=" + PID_LIMIT +
                     " -w /app " + IMAGE + " /bin/sh -c '" +
                     "g++ -w -std=c++17 -O2 " + jobId + ".cpp -o " + exeName + " && " + dockerRunCmd + "' 2>&1";

        auto start = high_resolution_clock::now();
        current_pipe = popen(cmd.c_str(), "r");

        if (!current_pipe)
            throw runtime_error("Pipe failed");

        // Read the output (stdout + stderr), capping at MAX_OUTPUT_SIZE to prevent buffer overflows
        string raw_out;
        array<char, 128> buf;
        while (fgets(buf.data(), buf.size(), current_pipe))
        {
            if (raw_out.size() < MAX_OUTPUT_SIZE)
                raw_out += buf.data();
        }

        int pclose_status = pclose(current_pipe);
        current_pipe = nullptr;

        int exit_code = WEXITSTATUS(pclose_status);

        // End wall-clock timer (used as a fallback if internal timing fails)
        auto end = high_resolution_clock::now();
        long duration = duration_cast<milliseconds>(end - start).count();

        // --- Extract Internal Execution Time ---
        long exec_duration = duration; // Default to wall-clock time
        fs::path timeFile = tempDir / timeFileName;
        if (fs::exists(timeFile))
        {
            FILE *tf = fopen(timeFile.c_str(), "r");
            if (tf)
            {
                long fetched_time = 0;
                if (fscanf(tf, "%ld", &fetched_time) == 1)
                {
                    exec_duration = fetched_time; // Overwrite with precise internal time
                }
                fclose(tf);
            }
            fs::remove(timeFile); // Cleanup the time file
        }

        // Cleanup the compiled binary
        fs::path exeFile = tempDir / exeName;
        if (fs::exists(exeFile))
        {
            fs::remove(exeFile);
        }

        // --- Verdict Evaluation Logic ---
        string status = "AC"; // Assume Accepted initially

        if (exit_code == 124)
        {
            // gtimeout/timeout killed the docker run command
            status = "TLE";
        }
        else if (exit_code == 137)
        {
            // SIGKILL (137) is issued by Docker's OOM killer
            // If it died super fast, it was an OOM (MLE). If it died near the time limit, it was a TLE.
            if (duration < THRESHOLD_MS)
                status = "MLE";
            else
                status = "TLE";
        }
        else if (exit_code != 0)
        {
            // The program (or compiler) exited with an error

            // 1. Check for Compilation Error
            if (raw_out.find("error:") != string::npos || raw_out.find("fatal error:") != string::npos)
            {
                status = "CE";
                exec_duration = 0; // FIX: Prevent massive junk numbers because the binary never ran
            }
            // 2. Check for C++ specific Memory Limit Exceeded (e.g., massive vector allocations)
            else if (raw_out.find("std::bad_alloc") != string::npos)
            {
                status = "MLE"; // FIX: Catch heap exhaustion before Docker OOM killer intervenes
            }
            // 3. Catch-all for Runtime Errors (Segfaults, Out of Bounds, etc.)
            else
            {
                status = "RE";
            }
        }

        // --- Final Sanity Check ---
        // If the time file parsing failed and gave a weird negative number,
        // and it wasn't a Compilation Error, fallback to the measured wall-clock duration
        if (status != "CE" && exec_duration < 0)
        {
            exec_duration = duration;
        }

        // --- JSON Response ---
        // Output the final verdict securely to standard out so Node.js can parse it
        cout << "{"
             << "\"status\":\"" << status << "\","
             << "\"time_ms\":" << exec_duration << ","
             << "\"output\":\"" << json_escape(raw_out) << "\""
             << "}" << endl;
    }
    catch (...)
    {
        // Failsafe for internal C++ engine errors
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: Engine Exception\"}" << endl;
    }
    return 0;
}
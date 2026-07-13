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

    if (argc < 4)
    {
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: Missing Job ID, Temp Path, or Language\"}" << endl;
        return 1;
    }

    try
    {
        string jobId = argv[1];   // MongoDB submission _id
        string pathArg = argv[2]; // absolute path to temp dir with files
        string language = argv[3]; // The programming language string

        fs::path tempDir(pathArg);
        
        string ext = ".cpp";
        if (language == "c") ext = ".c";
        else if (language == "python") ext = ".py";
        else if (language == "java") ext = ".java";
        else if (language == "javascript") ext = ".js";

        string srcFileName = (language == "java") ? "Main.java" : (jobId + ext);
        fs::path codePath = tempDir / srcFileName;
        fs::path inputPath = tempDir / "input.txt";

// macOS uses 'gtimeout', Linux uses standard 'timeout'
#ifdef __APPLE__
        string timeoutCmd = "gtimeout";
#else
        string timeoutCmd = "timeout";
#endif

        string exeName = "r_" + jobId;
        string timeFileName = "time_" + jobId + ".txt";

        string image = "gcc"; 
        string compileCmd = "";
        string runBinaryCmd = "";

        if (language == "cpp") {
            image = "gcc";
            compileCmd = "g++ -w -std=c++17 -O2 " + srcFileName + " -o " + exeName;
            runBinaryCmd = "./" + exeName;
        } else if (language == "c") {
            image = "gcc";
            compileCmd = "gcc -w -O2 " + srcFileName + " -o " + exeName;
            runBinaryCmd = "./" + exeName;
        } else if (language == "python") {
            image = "python:3.12-slim";
            compileCmd = "";
            runBinaryCmd = "python3 " + srcFileName;
        } else if (language == "javascript") {
            image = "node:20-slim";
            compileCmd = "";
            runBinaryCmd = "node " + srcFileName;
        } else if (language == "java") {
            image = "eclipse-temurin:21";
            compileCmd = "javac " + srcFileName;
            runBinaryCmd = "java -XX:+TieredCompilation -XX:TieredStopAtLevel=1 Main";
        }

        // --- The Execution Command ---
        string dockerRunCmd = "( start=$(date +%s%N); " + runBinaryCmd;
        if (fs::exists(inputPath))
        {
            dockerRunCmd += " < input.txt";
        }
        // compute in milliseconds using nanoseconds scaled down
        dockerRunCmd += "; exit_code=$?; end=$(date +%s%N); echo $(((end - start) / 1000000)) > " + timeFileName + "; exit $exit_code; )";

        string innerCmd = "";
        if (compileCmd != "") {
            innerCmd = compileCmd + " && " + dockerRunCmd;
        } else {
            innerCmd = dockerRunCmd;
        }

        // build the docker run command with all security flags
        string cmd = timeoutCmd + " -k 1s " + TIME_LIMIT + " docker run --rm --init " +
                     "--cpus=\"" + CPU_LIMIT + "\" " +
                     "--stop-timeout 1 " +
                     "-v \"" + tempDir.string() + ":/app\" " +
                     "--network none --memory=\"" + MEM_LIMIT + "\" " +
                     "--memory-swap=\"" + MEM_LIMIT + "\" --pids-limit=" + PID_LIMIT +
                     " -w /app " + image + " /bin/sh -c '" + innerCmd + "' 2>&1";

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

            // 1. Check for Internal Engine/Docker Errors
            if (exit_code == 125 || 
                raw_out.find("failed to connect to the docker API") != string::npos ||
                raw_out.find("Cannot connect to the Docker daemon") != string::npos)
            {
                status = "IE";
                exec_duration = 0;
            }
            // 2. Check for Compilation Error
            else if (raw_out.find("error:") != string::npos || 
                raw_out.find("fatal error:") != string::npos || 
                raw_out.find("SyntaxError") != string::npos || 
                raw_out.find("IndentationError") != string::npos || 
                raw_out.find("TabError") != string::npos)
            {
                status = "CE";
                exec_duration = 0; // FIX: Prevent massive junk numbers because the binary never ran
            }
            // 2. Check for Memory Limit Exceeded across languages (e.g., massive allocations before Docker OOM)
            else if (raw_out.find("std::bad_alloc") != string::npos ||
                     raw_out.find("java.lang.OutOfMemoryError") != string::npos ||
                     raw_out.find("MemoryError") != string::npos ||
                     raw_out.find("heap out of memory") != string::npos)
            {
                status = "MLE"; // FIX: Catch heap exhaustion across C++, Java, JS, Python
            }
            // 3. Specific fatal signal subtypes for Runtime Errors
            // Exit code = 128 + signal number (shell convention)
            else if (exit_code == 139) // SIGSEGV (signal 11): null pointer, out-of-bounds access
            {
                status = "RE (SIGSEGV)";
            }
            else if (exit_code == 134) // SIGABRT (signal 6): assert failure, abort() called
            {
                status = "RE (SIGABRT)";
            }
            else if (exit_code == 136) // SIGFPE (signal 8): divide by zero, overflow
            {
                status = "RE (SIGFPE)";
            }
            // 4. Catch-all for any other Runtime Error
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
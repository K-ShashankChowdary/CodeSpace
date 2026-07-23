#include <iostream>
#include <cstdio>
#include <string>
#include <array>
#include <filesystem>
#include <chrono>
#include <sys/wait.h>
#include <csignal>
#include <vector>
#include <fstream>
#include <sstream>

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

    if (argc < 5)
    {
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: Missing Job ID, Temp Path, Language, or NumTestCases\"}" << endl;
        return 1;
    }

    try
    {
        string jobId = argv[1];   // MongoDB submission _id
        string pathArg = argv[2]; // absolute path to temp dir with files
        string language = argv[3]; // The programming language string
        int numTestCases = stoi(argv[4]); // Number of test cases

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
        string runAllScript = tempDir.string() + "/run_all.sh";
        ofstream scriptFile(runAllScript);
        scriptFile << "#!/bin/bash\n";
        
        if (compileCmd != "") {
            scriptFile << compileCmd << " > compile_out.txt 2>&1\n";
            scriptFile << "if [ $? -ne 0 ]; then\n";
            scriptFile << "  echo \"CE\" > metadata.txt\n";
            scriptFile << "  exit 2\n";
            scriptFile << "fi\n";
        }
        
        scriptFile << "for i in $(seq 0 $((" << numTestCases << " - 1))); do\n";
        scriptFile << "  start=$(date +%s%N)\n";
        scriptFile << "  timeout 2s " << runBinaryCmd << " < input_${i}.txt > output_${i}.txt 2> err_${i}.txt\n";
        scriptFile << "  exit_code=$?\n";
        scriptFile << "  end=$(date +%s%N)\n";
        scriptFile << "  time_ms=$(((end - start) / 1000000))\n";
        scriptFile << "  echo \"$exit_code $time_ms\" >> metadata.txt\n";
        scriptFile << "  if [ $exit_code -ne 0 ]; then\n";
        scriptFile << "    break\n";
        scriptFile << "  fi\n";
        scriptFile << "done\n";
        scriptFile.close();

        string innerCmd = "bash run_all.sh";

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

        // Read docker output (for internal errors)
        string docker_out;
        array<char, 128> buf;
        while (fgets(buf.data(), buf.size(), current_pipe))
        {
            if (docker_out.size() < MAX_OUTPUT_SIZE)
                docker_out += buf.data();
        }

        int pclose_status = pclose(current_pipe);
        current_pipe = nullptr;
        int exit_code = WEXITSTATUS(pclose_status);

        // End wall-clock timer (used as a fallback)
        auto end = high_resolution_clock::now();
        long duration = duration_cast<milliseconds>(end - start).count();

        // Read metadata
        vector<string> metadata_lines;
        fs::path metaFile = tempDir / "metadata.txt";
        if (fs::exists(metaFile))
        {
            ifstream mf(metaFile);
            string line;
            while (getline(mf, line)) {
                if (line.size() > 0) metadata_lines.push_back(line);
            }
        }

        cout << "[";

        if (metadata_lines.size() > 0 && metadata_lines[0] == "CE") {
            string comp_out = "";
            fs::path coFile = tempDir / "compile_out.txt";
            if (fs::exists(coFile)) {
                ifstream cof(coFile);
                ostringstream ss;
                ss << cof.rdbuf();
                comp_out = ss.str();
            }
            if (comp_out.length() > MAX_OUTPUT_SIZE) {
                comp_out = comp_out.substr(0, MAX_OUTPUT_SIZE) + "\n...[Truncated]";
            }
            cout << "{\"status\":\"CE\",\"time_ms\":0,\"output\":\"" << json_escape(comp_out) << "\"}";
        } else {
            bool first = true;
            for (int i = 0; i < numTestCases; i++) {
                int inner_exit = 0;
                long inner_time = 0;
                
                if (i < metadata_lines.size()) {
                    sscanf(metadata_lines[i].c_str(), "%d %ld", &inner_exit, &inner_time);
                } else if (i == metadata_lines.size()) {
                    // This testcase didn't finish because docker was killed (OOM/TLE)
                    inner_exit = exit_code; // 137 or 124
                    inner_time = duration;
                } else {
                    // Didn't even start this testcase
                    break;
                }

                // Read output
                string raw_out = "";
                fs::path outFile = tempDir / ("output_" + to_string(i) + ".txt");
                fs::path errFile = tempDir / ("err_" + to_string(i) + ".txt");
                
                if (fs::exists(outFile)) {
                    ifstream of(outFile);
                    ostringstream ss;
                    ss << of.rdbuf();
                    raw_out += ss.str();
                }
                if (fs::exists(errFile)) {
                    ifstream ef(errFile);
                    ostringstream ss;
                    ss << ef.rdbuf();
                    raw_out += ss.str();
                }
                if (raw_out == "") {
                    raw_out = docker_out;
                }
                
                if (raw_out.length() > MAX_OUTPUT_SIZE) {
                    raw_out = raw_out.substr(0, MAX_OUTPUT_SIZE) + "\n...[Truncated]";
                }

                string status = "AC";
                if (inner_exit == 124) status = "TLE";
                else if (inner_exit == 137) {
                    if (inner_time < THRESHOLD_MS) status = "MLE";
                    else status = "TLE";
                }
                else if (inner_exit != 0) {
                    if (inner_exit == 125 || docker_out.find("failed to connect") != string::npos) {
                        status = "IE";
                        inner_time = 0;
                    }
                    else if (raw_out.find("std::bad_alloc") != string::npos ||
                             raw_out.find("java.lang.OutOfMemoryError") != string::npos ||
                             raw_out.find("MemoryError") != string::npos ||
                             raw_out.find("heap out of memory") != string::npos) {
                        status = "MLE";
                    }
                    else if (inner_exit == 139) status = "RE (SIGSEGV)";
                    else if (inner_exit == 134) status = "RE (SIGABRT)";
                    else if (inner_exit == 136) status = "RE (SIGFPE)";
                    else status = "RE";
                }
                
                if (!first) cout << ",";
                first = false;
                
                cout << "{"
                     << "\"status\":\"" << status << "\","
                     << "\"time_ms\":" << inner_time << ","
                     << "\"output\":\"" << json_escape(raw_out) << "\""
                     << "}";
                     
                if (inner_exit != 0) break; // Engine stopped here
            }
        }
        cout << "]" << endl;
    }
    catch (...)
    {
        // Failsafe for internal C++ engine errors
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: Engine Exception\"}" << endl;
    }
    return 0;
}
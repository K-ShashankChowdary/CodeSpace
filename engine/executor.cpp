#include <iostream>
#include <cstdio>
#include <string>
#include <array>
#include <filesystem>
#include <chrono>
#include <sys/wait.h>
#include <csignal>
#include <vector>

// Reference: https://medium.com/@blogs4devs/implementing-a-remote-code-execution-engine-from-scratch-4a765a3c7303
namespace fs = std::filesystem;
using namespace std;
using namespace std::chrono;

// Docker container resource limits
const string IMAGE = "cpp-runner";       // pre-built Docker image with g++
const int MAX_OUTPUT_SIZE = 10000;       // caps stdout buffer to 10KB to prevent memory bombs
const string MEM_LIMIT = "256m";         // limits container memory to 256MB, triggers OOM kill on overflow
const string CPU_LIMIT = "0.5";          // limits container to half a CPU core
const string PID_LIMIT = "64";           // blocks fork bombs by capping process count
const string TIME_LIMIT = "10s";          // max wall-clock time before gtimeout kills the process
const int THRESHOLD_MS = 9500;           // if killed before 3.5s = MLE, after = TLE

// stored globally so signal handler can close it
FILE* current_pipe = nullptr;

// cleans up the pipe if executor gets interrupted (Ctrl+C or SIGTERM)
void cleanup(int signum) {
    if (current_pipe) pclose(current_pipe);
    exit(signum);
}

// escapes special chars so raw output can be safely embedded in JSON
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

// Node.js worker spawns this with: ./executor <jobId> <tempDirPath>
int main(int argc, char *argv[]) {
    signal(SIGINT, cleanup);
    signal(SIGTERM, cleanup);

    if (argc < 3) {
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: Missing Job ID or Temp Path\"}" << endl;
        return 1;
    }

    try {
        string jobId = argv[1];       // MongoDB submission _id
        string pathArg = argv[2];     // absolute path to temp dir with .cpp and .txt files
        
        fs::path tempDir(pathArg); 
        fs::path codePath = tempDir / (jobId + ".cpp");
        fs::path inputPath = tempDir / (jobId + ".txt");
        
        // macOS uses gtimeout (brew install coreutils), Linux uses timeout
        #ifdef __APPLE__
            string timeoutCmd = "gtimeout"; 
        #else
            string timeoutCmd = "timeout";
        #endif
        
        string exeName = "r_" + jobId;
        string timeFileName = "time_" + jobId + ".txt";
        
        // if input file exists, pipe it as stdin to the compiled binary
        // We use single quotes for the outer sh -c command so that the host shell
        // does not expand $var. The container's sh will expand $(date +%s%N).
        string dockerRunCmd = "start=$(date +%s%N); ./" + exeName;
        if (fs::exists(inputPath)) {
            dockerRunCmd += " < " + jobId + ".txt";
        }
        // compute in milliseconds using nanoseconds scaled down
        dockerRunCmd += "; exit_code=$?; end=$(date +%s%N); echo $(((end - start) / 1000000)) > " + timeFileName + "; exit $exit_code";

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
                     "g++ -O2 " + jobId + ".cpp -o " + exeName + " && " + dockerRunCmd + "' 2>&1";

        auto start = high_resolution_clock::now();
        current_pipe = popen(cmd.c_str(), "r");
        
        if (!current_pipe) throw runtime_error("Pipe failed");

        // read container output, capped at MAX_OUTPUT_SIZE
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

        // attempt to read pure execution time from timeFile
        long exec_duration = duration; // fallback to full process time
        fs::path timeFile = tempDir / timeFileName;
        if (fs::exists(timeFile)) {
            FILE* tf = fopen(timeFile.c_str(), "r");
            if (tf) {
                long fetched_time = 0;
                if (fscanf(tf, "%ld", &fetched_time) == 1) {
                    exec_duration = fetched_time;
                }
                fclose(tf);
            }
            fs::remove(timeFile);
        }

        // clean up the binary created
        fs::path exeFile = tempDir / exeName;
        if (fs::exists(exeFile)) {
            fs::remove(exeFile);
        }

        // determine verdict from exit code and timing
        string status = "AC";
        
        if (exit_code == 124) {
            status = "TLE";  // gtimeout killed it
        } else if (exit_code == 137) {
            // SIGKILL: if it died fast (<3.5s) = OOM killed (MLE), otherwise TLE
            if (duration < THRESHOLD_MS) status = "MLE";
            else status = "TLE";
        } else if (exit_code != 0) {
            // check if g++ error messages present to distinguish CE from RE
            if (raw_out.find("error:") != string::npos || raw_out.find("fatal error:") != string::npos) {
                status = "CE";
            } else {
                status = "RE";
            }
        }

        // JSON output consumed by the Node.js worker
        cout << "{"
             << "\"status\":\"" << status << "\","
             << "\"time_ms\":" << exec_duration << ","
             << "\"output\":\"" << json_escape(raw_out) << "\""
             << "}" << endl;

    } catch (...) {
        cout << "{\"status\":\"IE\",\"output\":\"INTERNAL: Engine Exception\"}" << endl;
    }
    return 0;
}

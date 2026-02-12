/**
 * CodeSpace - Distributed Code Execution Engine
 * * Component: Docker Bridge
 * Description: 
 * Acts as the secure interface between the Host OS and the Container Engine.
 * Responsible for checking daemon health and establishing IPC pipes.
 * * Author: Shashank Chowdary
 * Date: 2026-02-12
 */

#include <iostream>
#include <cstdio>
#include <memory>
#include <stdexcept>
#include <string>
#include <array>

using namespace std;

/**
 * Class: DockerBridge
 * Encapsulates low-level system calls to control the container runtime.
 * Designed for modularity to support future orchestration features.
 */
class DockerBridge {
public:
    /**
     * Executes a shell command and captures standard output.
     * Uses popen() to establish a read-pipe for capturing logs.
     * * @param cmd The raw command string to execute.
     * @return The output of the command as a string.
     * @throws runtime_error if the pipe cannot be opened.
     */
    static string execute(const string& cmd) {
        array<char, 128> buffer;
        string result;
        
        // Redirect stderr to stdout (2>&1) to capture runtime errors
        // This ensures we catch Docker daemon failures (e.g., "Daemon not running")
        string secure_cmd = cmd + " 2>&1";

        // Open a read-only pipe to the shell
        unique_ptr<FILE, decltype(&pclose)> pipe(popen(secure_cmd.c_str(), "r"), pclose);
        
        if (!pipe) {
            throw runtime_error("Critical System Failure: popen() failed to open pipe.");
        }

        // Read the stream chunk by chunk
        while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
            result += buffer.data();
        }

        return result;
    }
};

int main() {
    cout << "============================================" << endl;
    cout << "[SYSTEM] Initializing CodeSpace Engine..." << endl;
    cout << "============================================" << endl;

    // Use 'alpine' for minimal footprint (5MB)
    // --rm ensures the container is garbage-collected immediately
    string test_cmd = "docker run --rm alpine echo 'CodeSpace Bridge: CONNECTION_ESTABLISHED'";

    try {
        cout << "[INFO] Pinging Docker Daemon..." << endl;
        string output = DockerBridge::execute(test_cmd);

        // Self-Verification Logic
        if (output.find("CodeSpace Bridge: CONNECTION_ESTABLISHED") != string::npos) {
            cout << "[SUCCESS] Docker Daemon is active and responding." << endl;
            cout << "[LOG] " << output;
        } else {
            cerr << "[FAILURE] Unexpected response from engine." << endl;
            cerr << "[LOG] " << output;
            return 1;
        }

    } catch (const exception& e) {
        cerr << "[CRITICAL] " << e.what() << endl;
        return 1;
    }

    cout << "============================================" << endl;
    return 0;
}
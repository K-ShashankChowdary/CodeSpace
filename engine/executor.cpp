/**
 * CodeSpace - Execution Engine
 * Description:
 * Manages containerized compilation and execution of user-submitted C++ code.
 * Uses Docker volume mounting for safe file access.
 * * Author: Shashank Chowdary
 */

#include <iostream>
#include <fstream>
#include <cstdio>
#include <memory>
#include <stdexcept>
#include <string>
#include <array>
#include <filesystem>

namespace fs = std::filesystem;
using namespace std;

// Docker configuration
const string IMAGE = "gcc:latest";
const string TEMP_DIR = "temp";
const string FILENAME = "solution.cpp";

class FileHandler
{
public:
    // Writes the submission string to a physical file for Docker to mount
    static fs::path save_submission(const string &code)
    {
        fs::path current_path = fs::current_path();
        fs::path full_path = current_path / TEMP_DIR / FILENAME;

        ofstream out(full_path);
        if (!out.is_open())
        {
            throw runtime_error("IO Error: Failed to write submission file.");
        }

        out << code;
        out.close();

        return current_path / TEMP_DIR;
    }
};

class DockerBridge
{
public:
    static string run_container(const fs::path &host_folder)
    {
        // Mount host path to /app inside container
        string volume_mount = "-v \"" + host_folder.string() + ":/app\"";

        // Compile and run in a single shell session
        string container_cmd = "g++ solution.cpp -o runner && ./runner";

        // Construct full docker command:
        // --rm: Cleanup container after exit
        // -w: Set working dir to mapped volume
        string cmd = "docker run --rm " + volume_mount + " -w /app " + IMAGE + " /bin/sh -c \"" + container_cmd + "\"";

        return execute(cmd);
    }

private:
    static string execute(const string &cmd)
    {
        array<char, 128> buffer;
        string result;

        // Redirect stderr to stdout to capture compiler errors
        string final_cmd = cmd + " 2>&1";

        unique_ptr<FILE, decltype(&pclose)> pipe(popen(final_cmd.c_str(), "r"), pclose);
        if (!pipe)
            throw runtime_error("Pipe failed to open");

        while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr)
        {
            result += buffer.data();
        }
        return result;
    }
};

int main()
{
    cout << "--- CodeSpace Engine Initialized ---" << endl;

    // Test Payload
    string user_code = R"(
        #include <iostream>
        int main() {
            std::cout << "CodeSpace Execution: Success" << std::endl;
            std::cout << "Result: " << (10 * 10) << std::endl;
            return 0;
        }
    )";

    try
    {
        fs::path mount_path = FileHandler::save_submission(user_code);
        cout << "[INFO] Submission saved at: " << mount_path << endl;

        cout << "[INFO] Triggering Docker container..." << endl;
        string output = DockerBridge::run_container(mount_path);

        cout << "\n[OUTPUT]\n"
             << output << "\n[END]" << endl;
    }
    catch (const exception &e)
    {
        cerr << "[ERROR] Execution failed: " << e.what() << endl;
        return 1;
    }

    return 0;
}
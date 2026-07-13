using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace RepoLens
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            string yamlPath = FindDockerComposeYaml();
            if (string.IsNullOrEmpty(yamlPath))
            {
                MessageBox.Show("Could not find docker-compose.yml in the current directory or parent directories.\n\nPlease place this launcher in the RepoLens project folder.", "RepoLens Launcher Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            string projectDir = Path.GetDirectoryName(yamlPath);

            // 1. Check if Docker is running
            if (!IsDockerRunning())
            {
                MessageBox.Show("Docker Desktop is not running. Please start Docker Desktop and try again.", "Docker Not Running", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            // 2. Start services
            MessageBox.Show("Starting RepoLens services (PostgreSQL, Redis, Backend, Frontend) via Docker Compose.\n\nThis may take a few seconds on the first run...", "RepoLens Launcher", MessageBoxButtons.OK, MessageBoxIcon.Information);

            if (!RunDockerCompose(projectDir))
            {
                MessageBox.Show("Failed to start RepoLens services. Please check Docker Compose logs.", "Launcher Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // 3. Wait and open UI
            Thread.Sleep(3000);
            try
            {
                Process.Start("http://localhost:3000");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Services started, but failed to open default browser: " + ex.Message, "Browser Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        static bool IsDockerRunning()
        {
            try
            {
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = "docker",
                    Arguments = "info",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                using (Process process = Process.Start(startInfo))
                {
                    process.WaitForExit();
                    return process.ExitCode == 0;
                }
            }
            catch
            {
                return false;
            }
        }

        static bool RunDockerCompose(string workingDir)
        {
            try
            {
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = "docker",
                    Arguments = "compose up -d",
                    WorkingDirectory = workingDir,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                using (Process process = Process.Start(startInfo))
                {
                    process.WaitForExit();
                    return process.ExitCode == 0;
                }
            }
            catch
            {
                return false;
            }
        }

        static string FindDockerComposeYaml()
        {
            string currentDir = AppDomain.CurrentDomain.BaseDirectory;
            while (!string.IsNullOrEmpty(currentDir))
            {
                string target = Path.Combine(currentDir, "docker-compose.yml");
                if (File.Exists(target))
                {
                    return target;
                }
                string parent = Path.GetDirectoryName(currentDir);
                if (parent == currentDir) break;
                currentDir = parent;
            }
            return null;
        }
    }
}

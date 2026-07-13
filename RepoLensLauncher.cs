using System;
using System.Collections.Generic;
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
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string workingDir = Directory.GetCurrentDirectory();
            List<string> searchedPaths = new List<string>();
            string resolvedDir = null;

            // 1. Check cached path
            string cachedPath = ReadCachedPath();
            if (!string.IsNullOrEmpty(cachedPath))
            {
                searchedPaths.Add(cachedPath + " (Cached in AppData)");
                if (IsValidProjectDir(cachedPath))
                {
                    resolvedDir = cachedPath;
                }
            }

            // 2. Check exe directory
            if (resolvedDir == null)
            {
                searchedPaths.Add(exeDir + " (Executable Directory)");
                if (IsValidProjectDir(exeDir))
                {
                    resolvedDir = exeDir;
                }
            }

            // 3. Check parent directories of executable
            if (resolvedDir == null)
            {
                string current = exeDir;
                while (!string.IsNullOrEmpty(current))
                {
                    string parent = Path.GetDirectoryName(current);
                    if (parent == current || string.IsNullOrEmpty(parent)) break;
                    searchedPaths.Add(parent + " (Parent Directory)");
                    if (IsValidProjectDir(parent))
                    {
                        resolvedDir = parent;
                        break;
                    }
                    current = parent;
                }
            }

            // 4. Prompt user if still not found
            if (resolvedDir == null)
            {
                using (FolderBrowserDialog dialog = new FolderBrowserDialog())
                {
                    dialog.Description = "RepoLens project folder containing 'docker-compose.yml' was not found automatically.\n\nPlease select the RepoLens project folder manually:";
                    dialog.ShowNewFolderButton = false;

                    if (dialog.ShowDialog() == DialogResult.OK)
                    {
                        string selected = dialog.SelectedPath;
                        searchedPaths.Add(selected + " (User Selected)");

                        if (IsValidProjectDir(selected))
                        {
                            resolvedDir = selected;
                            SaveCachedPath(selected);
                        }
                        else
                        {
                            ShowErrorDialog("Invalid project folder selected!", exeDir, workingDir, searchedPaths);
                            return;
                        }
                    }
                    else
                    {
                        ShowErrorDialog("Could not locate RepoLens project directory.", exeDir, workingDir, searchedPaths);
                        return;
                    }
                }
            }

            // 5. Check if Docker is running
            if (!IsDockerRunning())
            {
                MessageBox.Show("Docker Desktop is not running. Please start Docker Desktop and try again.", "Docker Not Running", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            // 6. Start services
            MessageBox.Show(string.Format("Starting RepoLens services via Docker Compose at:\n{0}\n\nThis may take a few seconds...", resolvedDir), "RepoLens Launcher", MessageBoxButtons.OK, MessageBoxIcon.Information);

            if (!RunDockerCompose(resolvedDir))
            {
                MessageBox.Show("Failed to start RepoLens services. Please check Docker Compose logs.", "Launcher Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // 7. Wait and open UI
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

        static bool IsValidProjectDir(string path)
        {
            if (string.IsNullOrEmpty(path)) return false;
            string target = Path.Combine(path, "docker-compose.yml");
            return File.Exists(target);
        }

        static string ReadCachedPath()
        {
            try
            {
                string configPath = GetConfigFilePath();
                if (File.Exists(configPath))
                {
                    return File.ReadAllText(configPath).Trim();
                }
            }
            catch { }
            return null;
        }

        static void SaveCachedPath(string path)
        {
            try
            {
                string configPath = GetConfigFilePath();
                string dir = Path.GetDirectoryName(configPath);
                if (!Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }
                File.WriteAllText(configPath, path);
            }
            catch { }
        }

        static string GetConfigFilePath()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            return Path.Combine(appData, Path.Combine("RepoLens", "launcher.cfg"));
        }

        static void ShowErrorDialog(string title, string exeDir, string workingDir, List<string> searchedPaths)
        {
            string pathsList = string.Join("\n- ", searchedPaths.ToArray());
            string message = string.Format(
                "{0}\n\n" +
                "Executable Directory:\n{1}\n\n" +
                "Current Working Directory:\n{2}\n\n" +
                "Directories Searched:\n- {3}",
                title, exeDir, workingDir, pathsList
            );
            MessageBox.Show(message, "RepoLens Launcher Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
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
    }
}

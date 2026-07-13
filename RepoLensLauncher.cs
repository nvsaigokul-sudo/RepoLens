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

            // 1. Check cached path in launcher.cfg
            string cachedPath = ReadCachedPath();
            if (!string.IsNullOrEmpty(cachedPath))
            {
                searchedPaths.Add(cachedPath + " (Cached in AppData)");
                if (IsValidProjectDir(cachedPath))
                {
                    resolvedDir = cachedPath;
                }
            }

            // 2. Check current executable directory
            if (resolvedDir == null)
            {
                searchedPaths.Add(exeDir + " (Executable Directory)");
                if (IsValidProjectDir(exeDir))
                {
                    resolvedDir = exeDir;
                }
            }

            // 3. Auto-detect downward from Executable directory (up to depth 3)
            if (resolvedDir == null)
            {
                List<string> detectedProjects = new List<string>();
                SearchForProjects(exeDir, 3, detectedProjects);

                if (detectedProjects.Count == 1)
                {
                    resolvedDir = detectedProjects[0];
                    SaveCachedPath(resolvedDir);
                    MessageBox.Show(string.Format("Auto-detected valid RepoLens project root at:\n{0}", resolvedDir), "Project Auto-Detected", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                else if (detectedProjects.Count > 1)
                {
                    using (ProjectSelectorForm selector = new ProjectSelectorForm(detectedProjects))
                    {
                        if (selector.ShowDialog() == DialogResult.OK && !string.IsNullOrEmpty(selector.SelectedProject))
                        {
                            resolvedDir = selector.SelectedProject;
                            SaveCachedPath(resolvedDir);
                        }
                    }
                }
            }

            // 4. Check parent directories of executable
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

            // 5. Prompt user manually with Folder Browser GUI
            if (resolvedDir == null)
            {
                using (FolderBrowserDialog dialog = new FolderBrowserDialog())
                {
                    dialog.Description = "Please select the ROOT folder of your RepoLens project.\n\n" +
                                         "The selected folder MUST contain the following files:\n" +
                                         "  - docker-compose.yml\n" +
                                         "  - titansearch-backend/ (Directory)\n" +
                                         "  - titansearch-frontend/ (Directory)\n\n" +
                                         "Example Folder Structure:\n" +
                                         "RepoLens/\n" +
                                         "├── docker-compose.yml\n" +
                                         "├── titansearch-backend/\n" +
                                         "└── titansearch-frontend/";
                    dialog.ShowNewFolderButton = false;

                    if (dialog.ShowDialog() == DialogResult.OK)
                    {
                        string selected = dialog.SelectedPath;
                        searchedPaths.Add(selected + " (User Selected)");

                        // Direct check
                        if (IsValidProjectDir(selected))
                        {
                            resolvedDir = selected;
                            SaveCachedPath(resolvedDir);
                        }
                        else
                        {
                            // Try scanning downwards from selected folder
                            List<string> subDetected = new List<string>();
                            SearchForProjects(selected, 3, subDetected);

                            if (subDetected.Count == 1)
                            {
                                resolvedDir = subDetected[0];
                                SaveCachedPath(resolvedDir);
                                MessageBox.Show(string.Format("Auto-detected valid RepoLens project root inside selected folder at:\n{0}", resolvedDir), "Project Auto-Detected", MessageBoxButtons.OK, MessageBoxIcon.Information);
                            }
                            else if (subDetected.Count > 1)
                            {
                                using (ProjectSelectorForm selector = new ProjectSelectorForm(subDetected))
                                {
                                    if (selector.ShowDialog() == DialogResult.OK && !string.IsNullOrEmpty(selector.SelectedProject))
                                    {
                                        resolvedDir = selector.SelectedProject;
                                        SaveCachedPath(resolvedDir);
                                    }
                                }
                            }
                            else
                            {
                                ShowErrorDialog("Invalid project folder selected!", exeDir, workingDir, searchedPaths, selected);
                                return;
                            }
                        }
                    }
                    else
                    {
                        ShowErrorDialog("Could not locate RepoLens project directory.", exeDir, workingDir, searchedPaths, null);
                        return;
                    }
                }
            }

            // 6. Check if Docker is running
            if (!IsDockerRunning())
            {
                MessageBox.Show("Docker Desktop is not running. Please start Docker Desktop and try again.", "Docker Not Running", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            // 7. Start services
            MessageBox.Show(string.Format("Starting RepoLens services via Docker Compose at:\n{0}\n\nThis may take a few seconds...", resolvedDir), "RepoLens Launcher", MessageBoxButtons.OK, MessageBoxIcon.Information);

            if (!RunDockerCompose(resolvedDir))
            {
                MessageBox.Show("Failed to start RepoLens services. Please check Docker Compose logs.", "Launcher Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // 8. Wait and open UI
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
            bool isValid;
            List<string> results;
            ValidateProjectDir(path, out results, out isValid);
            return isValid;
        }

        static void ValidateProjectDir(string path, out List<string> results, out bool isValid)
        {
            results = new List<string>();
            isValid = true;

            if (string.IsNullOrEmpty(path) || !Directory.Exists(path))
            {
                results.Add("✘ Root folder directory does not exist.");
                isValid = false;
                return;
            }

            string dockerCompose = Path.Combine(path, "docker-compose.yml");
            if (File.Exists(dockerCompose))
            {
                results.Add("[✔] docker-compose.yml (Found)");
            }
            else
            {
                results.Add("[✘] docker-compose.yml (Missing)");
                isValid = false;
            }

            string backendDir = Path.Combine(path, "titansearch-backend");
            if (Directory.Exists(backendDir))
            {
                results.Add("[✔] titansearch-backend/ (Found)");
            }
            else
            {
                results.Add("[✘] titansearch-backend/ (Missing)");
                isValid = false;
            }

            string frontendDir = Path.Combine(path, "titansearch-frontend");
            if (Directory.Exists(frontendDir))
            {
                results.Add("[✔] titansearch-frontend/ (Found)");
            }
            else
            {
                results.Add("[✘] titansearch-frontend/ (Missing)");
                isValid = false;
            }
        }

        static void SearchForProjects(string path, int depth, List<string> foundRoots)
        {
            if (depth <= 0) return;
            try
            {
                if (IsValidProjectDir(path))
                {
                    foundRoots.Add(path);
                    return;
                }

                foreach (string subDir in Directory.GetDirectories(path))
                {
                    string name = Path.GetFileName(subDir);
                    if (name.StartsWith(".") || name == "node_modules" || name == "bin" || name == "obj" || name == "target")
                        continue;

                    SearchForProjects(subDir, depth - 1, foundRoots);
                }
            }
            catch { }
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

        static void ShowErrorDialog(string title, string exeDir, string workingDir, List<string> searchedPaths, string selectedPath)
        {
            string pathsList = string.Join("\n- ", searchedPaths.ToArray());
            string validationDetails = "";

            if (!string.IsNullOrEmpty(selectedPath))
            {
                List<string> checkList;
                bool isValid;
                ValidateProjectDir(selectedPath, out checkList, out isValid);
                validationDetails = string.Format(
                    "Selected Folder:\n{0}\n\n" +
                    "Project Validation Checklist:\n{1}\n\n" +
                    "Reason:\nAt least one required project resource (docker-compose.yml, titansearch-backend/, or titansearch-frontend/) is missing. Please select the root project folder.\n\n",
                    selectedPath,
                    string.Join("\n", checkList.ToArray())
                );
            }

            string message = string.Format(
                "{0}\n\n" +
                "{1}" +
                "Executable Directory:\n{2}\n\n" +
                "Current Working Directory:\n{3}\n\n" +
                "Directories Searched:\n- {4}",
                title, validationDetails, exeDir, workingDir, pathsList
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

    public class ProjectSelectorForm : Form
    {
        private ListBox listBox;
        private Button btnOk;
        public string SelectedProject { get; private set; }

        public ProjectSelectorForm(List<string> options)
        {
            this.Text = "Select RepoLens Project Root";
            this.Size = new System.Drawing.Size(500, 320);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;

            Label label = new Label()
            {
                Text = "Multiple RepoLens projects were detected. Please select one:",
                Location = new System.Drawing.Point(15, 15),
                Size = new System.Drawing.Size(450, 20)
            };
            this.Controls.Add(label);

            listBox = new ListBox()
            {
                Location = new System.Drawing.Point(15, 45),
                Size = new System.Drawing.Size(450, 180)
            };
            foreach (var opt in options)
            {
                listBox.Items.Add(opt);
            }
            if (listBox.Items.Count > 0) listBox.SelectedIndex = 0;
            this.Controls.Add(listBox);

            btnOk = new Button()
            {
                Text = "Launch Selected",
                Location = new System.Drawing.Point(365, 235),
                Size = new System.Drawing.Size(100, 30),
                DialogResult = DialogResult.OK
            };
            btnOk.Click += (s, e) =>
            {
                this.SelectedProject = listBox.SelectedItem as string;
                this.Close();
            };
            this.Controls.Add(btnOk);
            this.AcceptButton = btnOk;
        }
    }
}

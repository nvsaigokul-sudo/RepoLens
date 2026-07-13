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

            // 5. Check if the default workspace already exists and contains a valid project
            if (resolvedDir == null)
            {
                string defaultWorkspace = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "RepoLens-Workspace");
                string defaultProjectRoot = Path.Combine(defaultWorkspace, "RepoLens-main");
                if (IsValidProjectDir(defaultProjectRoot))
                {
                    resolvedDir = defaultProjectRoot;
                    SaveCachedPath(resolvedDir);
                }
            }

            // 6. First-Time Setup Fallback: Automatically download, extract, and start services
            if (resolvedDir == null)
            {
                string defaultWorkspace = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "RepoLens-Workspace");
                string defaultProjectRoot = Path.Combine(defaultWorkspace, "RepoLens-main");
                string configFilePath = GetConfigFilePath();

                using (SetupProgressForm setupForm = new SetupProgressForm(defaultWorkspace, defaultProjectRoot, configFilePath))
                {
                    if (setupForm.ShowDialog() == DialogResult.OK)
                    {
                        resolvedDir = defaultProjectRoot;
                    }
                    else
                    {
                        // Setup cancelled or failed, exit application
                        return;
                    }
                }
            }

            // 7. Check if Docker is running
            if (!IsDockerRunning())
            {
                MessageBox.Show("Docker Desktop is not running. Please start Docker Desktop and try again.", "Docker Not Running", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            // 8. Start services
            MessageBox.Show(string.Format("Starting RepoLens services via Docker Compose at:\n{0}\n\nThis may take a few seconds...", resolvedDir), "RepoLens Launcher", MessageBoxButtons.OK, MessageBoxIcon.Information);

            if (!RunDockerCompose(resolvedDir))
            {
                MessageBox.Show("Failed to start RepoLens services. Please check Docker Compose logs.", "Launcher Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // 9. Wait and open UI in default browser
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

        public static bool IsValidProjectDir(string path)
        {
            bool isValid;
            List<string> results;
            ValidateProjectDir(path, out results, out isValid);
            return isValid;
        }

        public static void ValidateProjectDir(string path, out List<string> results, out bool isValid)
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

        public static void SaveCachedPath(string path)
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

        public static string GetConfigFilePath()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            return Path.Combine(appData, Path.Combine("RepoLens", "launcher.cfg"));
        }

        public static bool IsDockerRunning()
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

        public static bool RunDockerCompose(string workingDir)
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

    public class SetupProgressForm : Form
    {
        private ProgressBar progressBar;
        private Label statusLabel;
        private string workspacePath;
        private string projectRootPath;
        private string configPath;

        public SetupProgressForm(string workspacePath, string projectRootPath, string configPath)
        {
            this.workspacePath = workspacePath;
            this.projectRootPath = projectRootPath;
            this.configPath = configPath;

            this.Text = "RepoLens First-Time Setup";
            this.Size = new System.Drawing.Size(460, 180);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;

            Label welcomeLabel = new Label()
            {
                Text = "Setting up RepoLens Workspace...",
                Font = new System.Drawing.Font("Segoe UI", 10, System.Drawing.FontStyle.Bold),
                Location = new System.Drawing.Point(20, 15),
                Size = new System.Drawing.Size(400, 25)
            };
            this.Controls.Add(welcomeLabel);

            statusLabel = new Label()
            {
                Text = "Initializing setup processes...",
                Font = new System.Drawing.Font("Segoe UI", 9),
                Location = new System.Drawing.Point(20, 45),
                Size = new System.Drawing.Size(400, 20)
            };
            this.Controls.Add(statusLabel);

            progressBar = new ProgressBar()
            {
                Location = new System.Drawing.Point(20, 75),
                Size = new System.Drawing.Size(400, 25),
                Minimum = 0,
                Maximum = 100,
                Value = 0
            };
            this.Controls.Add(progressBar);

            this.Load += (s, e) => StartSetup();
        }

        private void StartSetup()
        {
            Thread thread = new Thread(PerformSetupSteps);
            thread.IsBackground = true;
            thread.Start();
        }

        private void UpdateStatus(string text, int percent)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action(() => UpdateStatus(text, percent)));
                return;
            }
            statusLabel.Text = text;
            progressBar.Value = percent;
        }

        private void PerformSetupSteps()
        {
            try
            {
                // Step 1: Check Docker
                UpdateStatus("Checking Docker Desktop status...", 10);
                if (!Program.IsDockerRunning())
                {
                    ShowError("Docker Desktop is not running.\n\nPlease start Docker Desktop first and rerun this launcher.");
                    return;
                }

                // Step 2: Download repository from GitHub
                UpdateStatus("Downloading RepoLens project from GitHub (Tls1.2)...", 30);
                string zipPath = Path.Combine(Path.GetTempPath(), "repolens_temp.zip");
                using (System.Net.WebClient client = new System.Net.WebClient())
                {
                    // Force TLS 1.2 for secure downloads from GitHub
                    System.Net.ServicePointManager.SecurityProtocol = (System.Net.SecurityProtocolType)3072;
                    client.DownloadFile("https://github.com/nvsaigokul-sudo/RepoLens/archive/refs/heads/main.zip", zipPath);
                }

                // Step 3: Extract repository ZIP to workspace
                UpdateStatus("Extracting files to local workspace...", 60);
                if (Directory.Exists(workspacePath))
                {
                    Directory.Delete(workspacePath, true);
                }
                Directory.CreateDirectory(workspacePath);

                // Use PowerShell Expand-Archive (built-in, reliable on Windows 10+)
                string psCommand = string.Format(
                    "Expand-Archive -Path '{0}' -DestinationPath '{1}' -Force",
                    zipPath, workspacePath
                );
                ProcessStartInfo psStart = new ProcessStartInfo
                {
                    FileName = "powershell",
                    Arguments = "-Command \"" + psCommand + "\"",
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                using (Process process = Process.Start(psStart))
                {
                    process.WaitForExit();
                    if (process.ExitCode != 0)
                    {
                        ShowError("Failed to extract files. PowerShell unzip failed.");
                        return;
                    }
                }

                // Delete temp ZIP
                try { File.Delete(zipPath); } catch { }

                if (!Program.IsValidProjectDir(projectRootPath))
                {
                    ShowError("Extracted directory structure is invalid. Required project files were not found.");
                    return;
                }

                // Step 4: Bootstrapping containers via Docker Compose
                UpdateStatus("Bootstrapping Docker containers...", 80);
                if (!Program.RunDockerCompose(projectRootPath))
                {
                    ShowError("Failed to start Docker Compose services. Verify your Docker setup.");
                    return;
                }

                // Step 5: Save cached directory path
                Program.SaveCachedPath(projectRootPath);

                UpdateStatus("Workspace ready! Launching application...", 100);
                Thread.Sleep(1000);

                this.BeginInvoke(new Action(() =>
                {
                    this.DialogResult = DialogResult.OK;
                    this.Close();
                }));
            }
            catch (Exception ex)
            {
                ShowError("An unexpected error occurred during setup: " + ex.Message);
            }
        }

        private void ShowError(string message)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action(() => ShowError(message)));
                return;
            }
            MessageBox.Show(message, "Setup Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            this.DialogResult = DialogResult.Cancel;
            this.Close();
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

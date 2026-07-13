using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace RepoLens
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            string appFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "RepoLens");
            bool isInstalled = IsApplicationInstalled(appFolder);

            // 1. First-Time Launch: Extract and Install Self-Contained Resources
            if (!isInstalled)
            {
                using (SetupProgressForm setupForm = new SetupProgressForm(appFolder))
                {
                    if (setupForm.ShowDialog() != DialogResult.OK)
                    {
                        // Setup failed or was closed, terminate launcher
                        return;
                    }
                }
            }

            // 2. Verify Docker Desktop status before launching
            if (!IsDockerRunning())
            {
                MessageBox.Show("Docker Desktop is not running. Please start Docker Desktop and run RepoLens again.", "Docker Not Running", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            // 3. Start local services
            MessageBox.Show("Launching RepoLens services via Docker Compose...\n\nThis may take a few seconds...", "RepoLens Launcher", MessageBoxButtons.OK, MessageBoxIcon.Information);

            if (!RunDockerCompose(appFolder))
            {
                MessageBox.Show("Failed to start RepoLens services. Please check your Docker configuration.", "Launcher Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // 4. Open default web browser
            Thread.Sleep(3000);
            try
            {
                Process.Start("http://localhost:3000");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Services started successfully, but failed to open default browser: " + ex.Message, "Browser Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        public static bool IsApplicationInstalled(string path)
        {
            if (!Directory.Exists(path)) return false;

            string dockerCompose = Path.Combine(path, "docker-compose.yml");
            string nginxConfig = Path.Combine(path, "nginx.conf");
            string backendJar = Path.Combine(path, "titansearch-backend-0.2.0.jar");
            string frontendDir = Path.Combine(path, "dist");

            return File.Exists(dockerCompose) &&
                   File.Exists(nginxConfig) &&
                   File.Exists(backendJar) &&
                   Directory.Exists(frontendDir) &&
                   File.Exists(Path.Combine(frontendDir, "index.html"));
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

        public static void ExtractResource(string resourceName, string outputPath)
        {
            Assembly assembly = Assembly.GetExecutingAssembly();
            using (Stream stream = assembly.GetManifestResourceStream(resourceName))
            {
                if (stream == null)
                    throw new Exception("Resource not found inside launcher binary: " + resourceName);

                using (FileStream fileStream = new FileStream(outputPath, FileMode.Create, FileAccess.Write))
                {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = stream.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        fileStream.Write(buffer, 0, bytesRead);
                    }
                }
            }
        }
    }

    public class SetupProgressForm : Form
    {
        private ProgressBar progressBar;
        private Label statusLabel;
        private string appFolder;

        public SetupProgressForm(string appFolder)
        {
            this.appFolder = appFolder;

            this.Text = "RepoLens First-Time Setup";
            this.Size = new System.Drawing.Size(460, 180);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;

            Label welcomeLabel = new Label()
            {
                Text = "Installing RepoLens Desktop...",
                Font = new System.Drawing.Font("Segoe UI", 10, System.Drawing.FontStyle.Bold),
                Location = new System.Drawing.Point(20, 15),
                Size = new System.Drawing.Size(400, 25)
            };
            this.Controls.Add(welcomeLabel);

            statusLabel = new Label()
            {
                Text = "Initializing installation...",
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

            this.Load += (s, e) => StartInstall();
        }

        private void StartInstall()
        {
            Thread thread = new Thread(PerformInstallSteps);
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

        private void PerformInstallSteps()
        {
            try
            {
                // Step 1: Check Docker
                UpdateStatus("Checking Docker Desktop status...", 10);
                if (!Program.IsDockerRunning())
                {
                    ShowError("Docker Desktop is not running.\n\nPlease start Docker Desktop first and try again.");
                    return;
                }

                // Create Application Directory
                UpdateStatus("Creating application directory...", 20);
                if (Directory.Exists(appFolder))
                {
                    Directory.Delete(appFolder, true);
                }
                Directory.CreateDirectory(appFolder);

                // Step 2: Extract Embedded Configurations
                UpdateStatus("Extracting configuration files...", 40);
                string dockerComposePath = Path.Combine(appFolder, "docker-compose.yml");
                string nginxConfigPath = Path.Combine(appFolder, "nginx.conf");

                Program.ExtractResource("RepoLens.docker-compose.prod.yml", dockerComposePath);
                Program.ExtractResource("RepoLens.nginx.conf", nginxConfigPath);

                // Step 3: Extract Backend JAR
                UpdateStatus("Extracting Spring Boot backend runtime...", 60);
                string backendJarPath = Path.Combine(appFolder, "titansearch-backend-0.2.0.jar");
                Program.ExtractResource("RepoLens.titansearch-backend-0.2.0.jar", backendJarPath);

                // Step 4: Extract and Unzip Frontend Assets
                UpdateStatus("Extracting React frontend bundle...", 75);
                string zipPath = Path.Combine(appFolder, "frontend.zip");
                string distPath = Path.Combine(appFolder, "dist");

                Program.ExtractResource("RepoLens.frontend.zip", zipPath);

                // Silent unzip using native PowerShell Expand-Archive
                string psCommand = string.Format(
                    "Expand-Archive -Path '{0}' -DestinationPath '{1}' -Force",
                    zipPath, distPath
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
                }

                try { File.Delete(zipPath); } catch { }

                if (!Program.IsApplicationInstalled(appFolder))
                {
                    ShowError("Installation verification failed. Some files were not successfully extracted.");
                    return;
                }

                // Step 5: Start services via Docker Compose
                UpdateStatus("Starting local Docker containers...", 90);
                if (!Program.RunDockerCompose(appFolder))
                {
                    ShowError("Failed to start Docker containers. Check Docker Desktop logs.");
                    return;
                }

                UpdateStatus("Installation complete! Launching RepoLens...", 100);
                Thread.Sleep(1000);

                this.BeginInvoke(new Action(() =>
                {
                    this.DialogResult = DialogResult.OK;
                    this.Close();
                }));
            }
            catch (Exception ex)
            {
                ShowError("An error occurred during installation: " + ex.Message);
            }
        }

        private void ShowError(string message)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action(() => ShowError(message)));
                return;
            }
            MessageBox.Show(message, "Installation Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            this.DialogResult = DialogResult.Cancel;
            this.Close();
        }
    }
}

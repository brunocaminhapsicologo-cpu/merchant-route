using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;

class MerchantRouteLauncher
{
    static bool IsLocalServerRunning(int port)
    {
        try
        {
            using (var client = new TcpClient())
            {
                var result = client.BeginConnect("127.0.0.1", port, null, null);
                bool success = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(400));
                return success && client.Connected;
            }
        }
        catch
        {
            return false;
        }
    }

    static void Main(string[] args)
    {
        string targetUrl = "https://merchant-route.vercel.app";
        if (IsLocalServerRunning(3000))
        {
            targetUrl = "http://localhost:3000";
        }

        string[] edgePaths = new string[]
        {
            @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            @"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
        };

        foreach (string edge in edgePaths)
        {
            if (File.Exists(edge))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = edge,
                    Arguments = "--app=" + targetUrl + " --window-size=1440,900",
                    UseShellExecute = true
                });
                return;
            }
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = targetUrl,
            UseShellExecute = true
        });
    }
}

param([int]$Port = 8843)

Add-Type -AssemblyName System.Net.HttpListener -ErrorAction SilentlyContinue

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$lanMode = $false
try {
  $listener.Prefixes.Add("http://+:$Port/")
  $listener.Start()
  $lanMode = $true
} catch {
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$Port/")
  $listener.Start()
}

Write-Host "Serving $root on http://localhost:$Port/"
if ($lanMode) {
  $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object { $_.AddressFamily -eq 'InterNetwork' -and -not $_.ToString().StartsWith('169.254') }
  foreach ($ip in $ips) { Write-Host "Also reachable on your network at http://$($ip.IPAddressToString):$Port/ (use this on your phone, same Wi-Fi)" }
} else {
  Write-Host "Note: only reachable at localhost (not from your phone)."
  Write-Host "To allow phone access, run this ONCE in an elevated PowerShell, then restart this script:"
  Write-Host "  netsh http add urlacl url=http://+:$Port/ user=Everyone"
  Write-Host "You may also need to allow the port through Windows Firewall."
}

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".jsx"  = "text/jsx; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".json" = "application/json; charset=utf-8"
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ($path -eq "/") { $path = "/Reeper Web.dc.html" }
    $full = Join-Path $root ($path.TrimStart("/"))
    $full = [System.IO.Path]::GetFullPath($full)
    if (-not $full.StartsWith($root)) {
      $res.StatusCode = 403
      $res.Close()
      continue
    }
    if (Test-Path $full -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ct = $mime[$ext]
      if (-not $ct) { $ct = "application/octet-stream" }
      $res.ContentType = $ct
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $path")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    try {
      $res.StatusCode = 500
      $msg = [System.Text.Encoding]::UTF8.GetBytes("Server error: $($_.Exception.Message)")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    } catch {}
  } finally {
    $res.Close()
  }
}

Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\madje\.gemini\antigravity-ide\brain\bedfdd34-6707-42e1-86bb-6c9cf311d9e4\.user_uploaded\media_1787959353789.jpg"
$destIcon = "c:\Users\madje\OneDrive\Desktop\my projects\startup new project\gym-saas-platform\public\icon.png"
$destLogo = "c:\Users\madje\OneDrive\Desktop\my projects\startup new project\gym-saas-platform\public\logo.png"

$img = [System.Drawing.Image]::FromFile($srcPath)
$img.Save($destIcon, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Save($destLogo, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Write-Host "Images successfully converted to PNG format."

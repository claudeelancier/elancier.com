; Inno Setup script for the Windows release folder.
; Build first: flutter build windows --release
; Compile this script on Windows with Inno Setup 6.
; The executable needs the DLLs and data folder beside it, so the whole Release directory is packaged.

#define MyAppName "Offline Billing Demo"
#define MyAppVersion "1.0.0"
#define MyAppExe "offline_billing_demo.exe"

[Setup]
AppId={{8C4E2A71-6B15-4E4A-9C3D-7A1F0B6E5D44}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={autopf}\OfflineBillingDemo
DefaultGroupName={#MyAppName}
OutputDir=..\..\build\windows\installer
OutputBaseFilename=OfflineBillingDemoSetup
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
WizardStyle=modern

[Files]
Source: "..\..\build\windows\x64\runner\Release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExe}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop icon"; GroupDescription: "Additional icons:"

[Run]
Filename: "{app}\{#MyAppExe}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent

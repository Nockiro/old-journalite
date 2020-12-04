!include "MUI2.nsh"

# This installs two files, app.exe and logo.ico, creates a start menu shortcut, builds an uninstaller, and
# adds uninstall information to the registry for Add/Remove Programs
 
# To get started, put this script into a folder with the two files (app.exe, logo.ico, and license.rtf -
# You'll have to create these yourself) and run makensis on it
 
# If you change the names "app.exe", "logo.ico", or "license.rtf" you should do a search and replace - they
# show up in a few places.
# All the other settings can be tweaked by editing the !defines at the top of this script
!define APPNAME "Journalite"
!define COMPANYNAME "Coding Robots"
!define DESCRIPTION "Journaling software"
# These three must be integers
!define VERSIONMAJOR 1
!define VERSIONMINOR 1
!define VERSIONBUILD 1
# These will be displayed by the "Click here for support information" link in "Add/Remove Programs"
# It is possible to use "mailto:" links in here to open the email client
!define HELPURL "http://www.codingrobots.com/support/" # "Support Information" link
!define UPDATEURL "http://www.codingrobots.com/Journalite/" # "Product Updates" link
!define ABOUTURL "http://www.codingrobots.com" # "Publisher" link
# This is the size (in kB) of all the files copied into "Program Files"
#!define INSTALLSIZE 7233
!define APPEXENAME "Journalite"

!define MUI_ICON "..\art\installer-icon.ico"

BrandingText " "
 
RequestExecutionLevel user ;Require user rights on NT6+ (When UAC is turned on)
 
InstallDir "$LOCALAPPDATA\${APPNAME}\app"

#TODO turn on
SetCompressor /SOLID lzma
 
# rtf or txt file - remember if it is txt, it must be in the DOS text format (\r\n)
#LicenseData "license.rtf"
# This will be in the installer/uninstaller's title bar
Name "${APPNAME}"
#Icon "logo.ico"
OutFile ${INSTALLERDIR}\${APPEXENAME}-installer.exe

!include LogicLib.nsh

!insertmacro MUI_DEFAULT MUI_BGCOLOR "FFFFFF"
!define MUI_WELCOMEFINISHPAGE_BITMAP "sidebar.bmp"
!define MUI_FINISHPAGE_TEXT_LARGE
#!define MUI_WELCOMEFINISHPAGE_BITMAP_NOSTRETCH
!define MUI_FINISHPAGE_TITLE "Installation Complete"
!define MUI_WELCOMEPAGE_TITLE "Install ${APPNAME}"
!define MUI_WELCOMEPAGE_TEXT "Ready to install the program on your computer.$\r$\n$\r$\nClick Install!"

# JUST THREE PAGES - LICENSE AGREEMENT, INSTALL LOCATION, AND INSTALLATION
#PAGE LICENSE
#PAGE DIRECTORY
#PAGE INSTFILES
!INSERTMACRO MUI_PAGE_LICENSE "license.rtf"
#!INSERTMACRO MUI_PAGE_DIRECTORY
!INSERTMACRO MUI_PAGE_INSTFILES
#!DEFINE MUI_FINISHPAGE_NOAUTOCLOSE
!DEFINE MUI_FINISHPAGE_RUN "$INSTDIR\${APPEXENAME}.EXE"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "install"
	# Files for the install directory - to build the installer, these should be in the same directory as the install script (this file)
	SetOutPath $INSTDIR
	# Files added here should be removed by the uninstaller (see section "uninstall")
	File ${FILESDIR}/credits.html
	File ${FILESDIR}/credits-app.txt
	File ${FILESDIR}/ffmpegsumo.dll
	File ${FILESDIR}/icudt.dll
	File ${FILESDIR}/libEGL.dll
	File ${FILESDIR}/libGLESv2.dll
	File ${FILESDIR}/Journalite.exe
	File ${FILESDIR}/nw.pak
	File ..\art\app.ico
 
	# Uninstaller - See function un.onInit and section "uninstall" for configuration
	WriteUninstaller "$INSTDIR\uninstall.exe"
 
	# Start Menu
	CreateDirectory "$SMPROGRAMS\${APPNAME}"
	CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\${APPEXENAME}.exe" "" "$INSTDIR\app.ico"
 
	# Registry information for add/remove programs
	WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "DisplayName" "${APPNAME} by ${COMPANYNAME}"
	WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
	WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "QuietUninstallString" "$\"$INSTDIR\uninstall.exe$\" /S"
	WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "InstallLocation" "$\"$INSTDIR$\""
	WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "DisplayIcon" "$\"$INSTDIR\${APPEXENAME}.ico$\""
	WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "Publisher" "$\"${COMPANYNAME}$\""
	WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "HelpLink" "$\"${HELPURL}$\""
	WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "URLUpdateInfo" "$\"${UPDATEURL}$\""
	WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "URLInfoAbout" "$\"${ABOUTURL}$\""
	WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "DisplayVersion" "$\"${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}$\""
	WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "VersionMajor" ${VERSIONMAJOR}
	WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "VersionMinor" ${VERSIONMINOR}
	# There is no option for modifying or repairing the install
	WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "NoModify" 1
	WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "NoRepair" 1
	# Set the INSTALLSIZE constant (!defined at the top of this script) so Add/Remove Programs can accurately report the size
	#WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "EstimatedSize" ${INSTALLSIZE}

	# Run the program.
	#ExecShell "" "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
SectionEnd
 
# Uninstaller
 
Function un.onInit
	SetShellVarContext all
 
	##Verify the uninstaller - last chance to back out
	#MessageBox MB_OKCANCEL "Permanantly remove ${APPNAME}?" IDOK next
	#	Abort
	#next:
FunctionEnd
 
Section "uninstall"
 
	# Remove Start Menu launcher
	Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
	# Try to remove the Start Menu folder - this will only happen if it is empty
	RmDir "$SMPROGRAMS\${APPNAME}"
 
	# Remove files
	Delete $INSTDIR\credits.html
	Delete $INSTDIR\credits-app.txt
	Delete $INSTDIR\ffmpegsumo.dll
	Delete $INSTDIR\icudt.dll
	Delete $INSTDIR\libEGL.dll
	Delete $INSTDIR\libGLESv2.dll
	Delete $INSTDIR\Journalite.exe
	Delete $INSTDIR\nw.pak
	Delete $INSTDIR\app.ico
 
	# Always delete uninstaller as the last action
	Delete $INSTDIR\uninstall.exe
 
	# Try to remove the install directory - this will only happen if it is empty
	RmDir $INSTDIR
 
	# Remove uninstaller information from the registry
	DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}"
SectionEnd

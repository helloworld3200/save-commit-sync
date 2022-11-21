@echo off
for %%i in ("%~dp0..") do set "folder=%%~fi"
cd %folder%/packages
%folder%/"vsce package"

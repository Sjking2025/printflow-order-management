@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script for mvnw
@REM ----------------------------------------------------------------------------
@setlocal enabledelayedexpansion
@echo off
set BASE_DIR=%~dp0
set WRAPPER_JAR=%BASE_DIR%.mvn\wrapper\maven-wrapper.jar
if not exist "%WRAPPER_JAR%" (
    echo Error: Maven wrapper jar not found at %WRAPPER_JAR%
    echo Download it manually or install maven
    exit /b 1
)
"%JAVA_HOME%/bin/java" -jar "%WRAPPER_JAR%" %*
@endlocal

@echo off
echo ===========================================
echo FIREBASE STORAGE CORS CONFIGURATION SETUP
echo ===========================================
echo.
echo This script will configure CORS for Firebase Storage
echo to allow image uploads from your deployed app.
echo.
echo REQUIRED: Google Cloud CLI (gsutil) must be installed
echo.
echo STEP 1: Install Google Cloud CLI
echo - Download from: https://cloud.google.com/sdk/docs/install
echo - Or install with: winget install Google.CloudCLI (Windows)
echo.
echo STEP 2: Authenticate with Google Cloud
echo Run: gcloud auth login
echo.
echo STEP 3: Set your project (if needed)
echo Run: gcloud config set project project-0072b519-b9bc-4a17-885
echo.
echo STEP 4: Apply CORS configuration
echo Run: gsutil cors set cors.json gs://project-0072b519-b9bc-4a17-885.firebasestorage.app
echo.
echo STEP 5: Verify CORS configuration
echo Run: gsutil cors get gs://project-0072b519-b9bc-4a17-885.firebasestorage.app
echo.
echo The output should show your CORS configuration.
echo.
echo TROUBLESHOOTING:
echo - If you get "Access denied", make sure you're logged in with the right account
echo - If you get "Bucket not found", check your bucket name in cors.json
echo - If uploads still fail, check Firebase Storage Security Rules
echo.
pause
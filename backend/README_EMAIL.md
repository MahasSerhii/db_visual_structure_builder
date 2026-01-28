# Backend Configuration

This folder contains the Node.js backend for the Visual DB Viewer.

## Email Service Setup

The app triggers emails for Invites and Logins. 
By default, it runs in **Mock Mode**, printing email content to the console.

To enable **Real Email Sending**:

1. Open `.env` file.
2. Set your SMTP credentials.

### Example for Gmail:
1. Enable 2-Step Verification in Google Account.
2. Generate an **App Password**.
3. Update `.env`:
   ```
   SMTP_SERVICE=gmail
   SMTP_EMAIL=your.email@gmail.com
   SMTP_PASS=xxxx-xxxx-xxxx-xxxx
   ```

### Example for Custom SMTP:
   ```
   # SMTP_SERVICE=  <-- Comment this out
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_EMAIL=bot@example.com
   SMTP_PASS=password123
   ```

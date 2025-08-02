# Google reCAPTCHA Setup Guide

## Step 1: Get reCAPTCHA Keys

1. **Go to Google reCAPTCHA Console:**
   - Visit: https://www.google.com/recaptcha/admin/create

2. **Create a new site:**
   - **Label:** FileVault (or any name you prefer)
   - **reCAPTCHA type:** Select "reCAPTCHA v2" → "I'm not a robot" checkbox
   - **Domains:** Add these domains:
     - `localhost`
     - `127.0.0.1`
     - Your production domain (if you have one)

3. **Accept terms and submit**

4. **Copy your keys:**
   - **Site Key** (public key) - starts with `6L...`
   - **Secret Key** (private key) - starts with `6L...`

## Step 2: Update Environment Variables

1. Open your `.env` file in the project root
2. Replace the placeholder values:
   ```
   CAPTCHA_SITE_KEY=6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   CAPTCHA_SECRET_KEY=6LcYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
   ```

## Step 3: Test the Setup

1. Start your server:
   ```bash
   npm start
   ```

2. Open your browser and go to `http://localhost:5000/login.html`

3. The reCAPTCHA should appear automatically

4. Try logging in with valid credentials after completing the CAPTCHA

## Step 4: Create an Admin User

You'll need at least one admin user to access the admin dashboard. You can create one by:

1. **Option 1:** Manually update a user in your database:
   ```javascript
   // In MongoDB shell or a script
   db.users.updateOne(
     { email: "admin@yourdomain.com" },
     { $set: { role: "admin" } }
   )
   ```

2. **Option 2:** Sign up normally, then manually change the role in the database

## Troubleshooting

### reCAPTCHA not loading:
- Check browser console for errors
- Ensure your domain is added to the reCAPTCHA site settings
- Verify your site key is correct

### reCAPTCHA fails verification:
- Check your secret key is correct
- Ensure your server can reach Google's servers
- Check for any firewall issues

### Admin login not working:
- Ensure you have created an admin user
- Check that email configuration is working for OTP delivery
- Verify EMAIL_USER and EMAIL_PASS in .env file

## Environment Variables Checklist

Make sure these are set in your `.env` file:
- ✅ `CAPTCHA_SITE_KEY`
- ✅ `CAPTCHA_SECRET_KEY`
- ✅ `EMAIL_USER` (for OTP emails)
- ✅ `EMAIL_PASS` (for OTP emails)
- ✅ `JWT_SECRET`
- ✅ `MONGO_URI`

## Testing Commands

```bash
# Test regular user login (with CAPTCHA)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password","captchaToken":"test-token"}'

# Test CAPTCHA config endpoint
curl http://localhost:5000/api/auth/captcha-config

# Test admin login (sends OTP)
curl -X POST http://localhost:5000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

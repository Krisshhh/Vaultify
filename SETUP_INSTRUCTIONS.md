# FileVault Setup Instructions

## Issues Fixed ✅

1. **Performance improvements** - Added proper middleware and optimized queries
2. **Tab functionality** - All tabs now work with proper data loading
3. **File download issues** - Fixed download functionality to maintain files in vault
4. **Added file sharing** - Complete file sharing system between users
5. **Admin dashboard** - Role-based access with analytics
6. **CAPTCHA integration** - Replaced OTP with CAPTCHA for regular users

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure reCAPTCHA (Important!)
1. Go to https://www.google.com/recaptcha/admin/create
2. Create new site with:
   - **Type:** reCAPTCHA v2 "I'm not a robot"
   - **Domains:** `localhost`, `127.0.0.1`, your production domain
3. Copy your keys to `.env`:
   ```
   CAPTCHA_SITE_KEY=your_site_key_here
   CAPTCHA_SECRET_KEY=your_secret_key_here
   ```

### 3. Create Admin User
Run this in MongoDB shell or MongoDB Compass:
```javascript
// First create a regular user account through signup
// Then promote to admin:
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { role: "admin" } }
)
```

### 4. Test the System

#### Regular User Flow:
1. Visit `http://localhost:5000/signup.html`
2. Create account
3. Visit `http://localhost:5000/login.html`
4. Login with CAPTCHA (no OTP needed)
5. Access dashboard with all tabs working

#### Admin Flow:
1. Click "Admin Login" on login page
2. Enter admin credentials
3. Receive OTP via email
4. Access admin dashboard with analytics

#### File Sharing Flow:
1. Upload files in "My Files" tab
2. Click "Share" button on any file
3. Enter recipient email and set permissions
4. Recipient sees file in "Shared with Me" tab

## Key Features Implemented

### 🔐 Authentication
- **Regular users:** CAPTCHA verification
- **Admins:** OTP email verification
- **Role-based access control**

### 📁 File Management
- Upload encrypted files to S3
- Download files (files remain in vault)
- Delete files permanently
- File expiration handling

### 🤝 File Sharing
- Share files with other users by email
- Set download/view permissions
- Set expiration dates
- Track download counts
- Revoke shares

### 📊 Admin Analytics
- User registration trends
- File upload/download statistics
- System health monitoring
- User management (promote/demote roles)

### 🎨 UI/UX
- Tabbed dashboard interface
- Responsive design
- Modal dialogs for file sharing
- Real-time status updates

## API Endpoints

### Authentication
- `POST /api/auth/login` - Regular user login (with CAPTCHA)
- `POST /api/auth/admin/login` - Admin login (sends OTP)
- `POST /api/auth/admin/verify-otp` - Admin OTP verification
- `GET /api/auth/captcha-config` - Get CAPTCHA site key

### File Management
- `GET /api/files/my-files` - Get user's files
- `DELETE /api/files/delete/:fileId` - Delete user's file
- `GET /api/files/download/:token` - Download file

### File Sharing
- `POST /api/share/share` - Share file with user
- `GET /api/share/received` - Get files shared with me
- `GET /api/share/sent` - Get files I've shared
- `GET /api/share/:token` - Access shared file details
- `GET /api/share/:token/download` - Download shared file
- `DELETE /api/share/:shareId` - Revoke file share

### Admin Dashboard
- `GET /api/admin/dashboard/stats` - Dashboard overview
- `GET /api/admin/analytics/users` - User analytics
- `GET /api/admin/analytics/files` - File analytics
- `GET /api/admin/system/health` - System health
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:userId/role` - Update user role

## Performance Optimizations Applied

1. **Database Indexing** - Added indexes on frequently queried fields
2. **Request Caching** - Optimized middleware stack
3. **File Streaming** - Proper file streaming for downloads
4. **Analytics Tracking** - Asynchronous analytics logging
5. **Error Handling** - Comprehensive error handling

## Security Features

1. **JWT Authentication** - Secure token-based auth
2. **File Encryption** - All files encrypted before S3 storage
3. **Role-based Access** - Admin vs user permissions
4. **CAPTCHA Protection** - Prevents bot attacks
5. **Share Token Security** - Unique tokens for file sharing
6. **IP Tracking** - Analytics include IP addresses

## Testing Checklist

- [ ] Regular user signup/login with CAPTCHA
- [ ] Admin login with OTP email
- [ ] File upload and download
- [ ] File sharing between users
- [ ] Tab switching in dashboard
- [ ] File deletion
- [ ] Share revocation
- [ ] Admin analytics dashboard
- [ ] User role management

## Troubleshooting

### CAPTCHA not loading:
- Check browser console for errors
- Verify CAPTCHA keys in .env
- Ensure domain is registered with Google reCAPTCHA

### File downloads failing:
- Check S3 credentials and permissions
- Verify file encryption key is 32 characters
- Check network connectivity to S3

### Admin dashboard not accessible:
- Ensure user has admin role in database
- Check email configuration for OTP delivery
- Verify admin OTP verification flow

### Performance issues:
- Check database connection
- Monitor S3 response times
- Review server logs for errors

## Next Steps (Optional Enhancements)

1. Add file preview functionality
2. Implement bulk file operations
3. Add email notifications for shares
4. Create file version history
5. Add advanced analytics charts
6. Implement file compression
7. Add multi-factor authentication options

# 🔐 UTAS SNA System - Authentication API Documentation

## Overview
The UTAS Social Network Analysis System includes a complete JWT-based authentication system with user registration, login, profile management, and role-based access control.

---

## 🚀 Quick Start

### 1. Register a User
```bash
POST /api/auth/register
Content-Type: application/json

{
    "username": "alice",
    "email": "alice@utas.edu",
    "password": "Alice123!",
    "full_name": "Alice Johnson",
    "college": "College of Science",
    "department": "Biology",
    "year": 3
}
```

**Response (201):**
```json
{
    "success": true,
    "message": "User registered successfully",
    "user": {
        "id": 2,
        "username": "alice",
        "email": "alice@utas.edu",
        "full_name": "Alice Johnson",
        "role": "student",
        "is_active": true,
        "created_at": "2026-06-11T01:35:55.714825",
        "last_login": null
    },
    "tokens": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "Bearer",
        "expires_in": 1800
    }
}
```

### 2. Login
```bash
POST /api/auth/login
Content-Type: application/json

{
    "username": "alice",
    "password": "Alice123!"
}
```

**Response (200):**
```json
{
    "success": true,
    "message": "Login successful",
    "user": { ... },
    "tokens": { ... }
}
```

### 3. Access Protected Route
```bash
GET /api/auth/profile
Authorization: Bearer <access_token>
```

---

## 📋 Complete API Reference

### Authentication Endpoints

#### `POST /api/auth/register`
Register a new user account.

**Request Body:**
```json
{
    "username": "string (required, unique)",
    "email": "string (required, unique, valid email)",
    "password": "string (required, min 6 chars)",
    "full_name": "string (required)",
    "tribe": "string (optional)",
    "party": "string (optional, e.g., TESCON, TEIN)",
    "college": "string (optional)",
    "department": "string (optional)",
    "year": "integer (optional)"
}
```

**Responses:**
- `201` - User registered successfully
- `400` - Missing fields or validation error
- `500` - Server error

**Auto-Login:** User is automatically logged in after registration with JWT tokens.

---

#### `POST /api/auth/login`
Authenticate user and get JWT tokens.

**Request Body:**
```json
{
    "username": "string (required)",
    "password": "string (required)"
}
```

**Responses:**
- `200` - Login successful, tokens returned
- `400` - Missing username/password
- `401` - Invalid credentials or inactive account
- `500` - Server error

---

#### `POST /api/auth/logout`
Logout (invalidate token on client side).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

---

#### `GET /api/auth/profile`
Get current user's profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
    "success": true,
    "user": {
        "id": 2,
        "username": "alice",
        "email": "alice@utas.edu",
        "full_name": "Alice Johnson",
        "tribe": null,
        "party": null,
        "college": "College of Science",
        "department": "Biology",
        "year": 3,
        "role": "student",
        "is_active": true,
        "created_at": "2026-06-11T01:35:55.714825",
        "last_login": "2026-06-11T01:36:16.004731"
    }
}
```

---

#### `PUT /api/auth/profile`
Update current user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
    "full_name": "string",
    "email": "string",
    "tribe": "string",
    "party": "string",
    "college": "string",
    "department": "string",
    "year": "integer"
}
```

**Response (200):**
```json
{
    "success": true,
    "message": "Profile updated successfully",
    "user": { ... }
}
```

---

#### `POST /api/auth/change-password`
Change user's password.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "old_password": "string (required)",
    "new_password": "string (required, min 6 chars)"
}
```

**Responses:**
- `200` - Password changed successfully
- `400` - Missing fields or old password incorrect
- `401` - Unauthorized
- `500` - Server error

---

#### `DELETE /api/auth/profile`
Delete user account (requires password confirmation).

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "password": "string (required)"
}
```

**Responses:**
- `200` - Account deleted successfully
- `400` - Password required
- `401` - Invalid password
- `500` - Server error

---

#### `POST /api/auth/refresh`
Refresh access token using refresh token.

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response (200):**
```json
{
    "success": true,
    "message": "Token refreshed successfully",
    "tokens": {
        "access_token": "new_token...",
        "token_type": "Bearer",
        "expires_in": 1800
    }
}
```

---

### Admin Endpoints (Admin Role Required)

#### `GET /api/auth/users`
Get all users with pagination.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `skip` - Number of records to skip (default: 0)
- `limit` - Number of records to return (default: 50)

**Response (200):**
```json
{
    "success": true,
    "users": [ ... ],
    "total": 15,
    "skip": 0,
    "limit": 50
}
```

---

#### `GET /api/auth/users/<user_id>`
Get specific user by ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
- `200` - User found
- `404` - User not found
- `403` - Admin access required

---

#### `PUT /api/auth/users/<user_id>/role`
Assign role to user.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "role": "string (admin|campaign_manager|student)"
}
```

**Response:**
- `200` - Role assigned successfully
- `400` - Invalid role
- `403` - Admin access required
- `404` - User not found

---

## 🔑 Token Management

### Token Types
- **Access Token**: Short-lived (30 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access token

### Using Tokens

**In Request Headers:**
```
Authorization: Bearer <access_token>
```

**Storing Tokens (Frontend):**
```javascript
// Store after login
localStorage.setItem('accessToken', tokens.access_token);
localStorage.setItem('refreshToken', tokens.refresh_token);

// Use in requests
fetch('/api/auth/profile', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
});
```

### Token Refresh Flow
```
1. Access token expires (30 min)
2. Frontend detects 401 response
3. Send refresh token to /api/auth/refresh
4. Get new access token
5. Retry original request
```

---

## 👥 User Roles

### Student (Default)
- Create own profile
- View own data
- Update own profile
- Change own password
- Delete own account

### Campaign Manager
- All Student permissions
- Create and manage campaigns
- View all campaign data
- Access campaign analysis

### Admin
- All permissions
- Manage all users
- Assign roles
- View all system data
- System configuration

---

## 🛡️ Security Features

✅ **Password Security**
- Passwords hashed with werkzeug
- Never stored in plaintext
- Min 6 characters required

✅ **Token Security**
- JWT with HS256 algorithm
- Token expiration (30 min access, 7 day refresh)
- CSRF protection enabled

✅ **Account Security**
- Account activation status (is_active)
- Last login tracking
- Password change confirmation required
- Account deletion requires password

✅ **Access Control**
- Role-based access control (RBAC)
- Protected routes with decorators
- Admin-only endpoints

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
    "success": false,
    "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
    "success": false,
    "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
    "success": false,
    "message": "Admin access required"
}
```

### 404 Not Found
```json
{
    "success": false,
    "message": "User not found"
}
```

### 500 Server Error
```json
{
    "success": false,
    "message": "Registration failed"
}
```

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    tribe VARCHAR(64),
    party VARCHAR(64),
    college VARCHAR(120),
    department VARCHAR(120),
    year INTEGER,
    role_id INTEGER FOREIGN KEY,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME,
    updated_at DATETIME,
    last_login DATETIME
);
```

### Roles Table
```sql
CREATE TABLE roles (
    id INTEGER PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL,
    description VARCHAR(256)
);
```

---

## 🧪 Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@utas.edu","password":"Test123!","full_name":"Test User"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Test123!"}'
```

### Get Profile
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🚀 Next Steps

1. **Frontend Integration**: Create React components for login/registration
2. **Dashboard**: Build protected dashboard that requires authentication
3. **Role-Based UI**: Show different UI based on user role
4. **Token Refresh**: Implement automatic token refresh on expiration
5. **Protected Routes**: Create private routes for authenticated users

---

**Status**: ✅ Production Ready

For questions or issues, contact the development team.

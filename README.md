# Food Distribution System - NGO Management Portal

A comprehensive web application for managing food distribution to beneficiaries, built for the Saylani Mass IT Training hackathon.

## 🚀 Tech Stack

- **React JS** - Frontend framework
- **Tailwind CSS** - Styling
- **Firebase Authentication** - Email/Password authentication
- **Firebase Firestore** - Database
- **React Router** - Routing
- **Context API** - State management for auth & roles
- **React Hot Toast** - Notifications

## ✨ Features

### Role-Based Access Control (RBAC)

#### Super Admin
- Create Admin and Staff accounts
- Delete Admin and Staff accounts
- Activate/Deactivate accounts
- View all users

#### Admin
- Register beneficiaries
- Approve/Reject beneficiaries
- Edit beneficiary details
- Schedule food distribution
- Generate tokens (SAY-XXXX format)
- Assign distribution centers

#### Staff
- View beneficiaries (read-only)
- Search food token
- Mark food as distributed

### Modules

1. **Beneficiary Registration**
   - CNIC validation (13 digits, unique)
   - Name, Phone, Address
   - Family members count
   - Income level selection

2. **Dashboard**
   - Total registered beneficiaries
   - Food packages distributed today
   - Active distribution centers
   - CNIC search functionality

3. **Beneficiary Management**
   - List all beneficiaries
   - Edit details
   - Approve/Reject
   - Mark Active/Inactive

4. **Food Scheduling**
   - Assign pickup date & time
   - Generate unique token (SAY-XXXX)
   - Assign distribution center
   - View all schedules

5. **Distribution**
   - Search by token
   - Mark food as distributed
   - View beneficiary details

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd task
```

2. Install dependencies:
```bash
npm install
```

3. Firebase is already configured in `src/firebase/config.js`

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## 🔥 Firebase Setup

The Firebase configuration is already set up. Make sure:

1. **Firestore Collections** are created:
   - `users` - Stores system users (Super Admin, Admin, Staff)
   - `beneficiaries` - Stores beneficiary information (CNIC as document ID)
   - `foodSchedules` - Stores food distribution schedules

2. **Firebase Authentication** is enabled with Email/Password provider

3. **Firestore Security Rules** should be configured appropriately

## 📁 Project Structure

```
src/
├── components/
│   ├── Layout.jsx          # Main layout with sidebar
│   └── ProtectedRoute.jsx   # Route protection component
├── context/
│   └── AuthContext.jsx      # Authentication context
├── firebase/
│   └── config.js           # Firebase configuration
├── pages/
│   ├── Login.jsx           # Login page
│   ├── Dashboard.jsx       # Dashboard with stats
│   ├── UserManagement.jsx  # Super Admin user management
│   ├── RegisterBeneficiary.jsx  # Beneficiary registration
│   ├── Beneficiaries.jsx   # Beneficiary management
│   ├── FoodScheduling.jsx  # Food scheduling
│   ├── Distribution.jsx   # Distribution (Staff)
│   └── Unauthorized.jsx    # 403 page
├── App.jsx                 # Main app component with routes
├── main.jsx               # Entry point
└── index.css              # Global styles
```

## 🎨 UI/UX Features

- **Green & White Theme** (#10b981)
- **Dashboard layout** with sidebar navigation
- **Role-based sidebar items**
- **Clean tables & cards**
- **Toast notifications** for user feedback
- **Responsive design** (mobile & desktop)

## 🔐 Authentication

- Login with email & password
- Role-based protected routes
- Redirect unauthorized users to `/unauthorized`
- Logout functionality

## 📝 Usage

1. **Login** with your credentials
2. Based on your role, you'll see different menu options
3. **Super Admin** can manage users
4. **Admin** can register beneficiaries and schedule distributions
5. **Staff** can search tokens and mark food as distributed

## 🛠️ Build for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## 📄 License

This project is created for the Saylani Mass IT Training hackathon.

## 👨‍💻 Developer Notes

- All Firebase collections are pre-defined and should not be modified
- CNIC is used as the document ID for beneficiaries
- Tokens are generated in SAY-XXXX format
- The app uses Context API for global state management
- All routes are protected based on user roles


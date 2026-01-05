# Team Task Manager

A full-stack team task management application built with React, Redux Toolkit, and Supabase.

## Features

- ✅ **User Authentication** - Register and login with email/password
- ✅ **Team Management** - Create teams, join teams via Team ID
- ✅ **Task Management** - Create, update status, and delete tasks
- ✅ **Member Management** - Add/remove team members (admin only)
- ✅ **Role-based Access** - Admin and Member roles
- ✅ **Row Level Security** - Secure data access with Supabase RLS

## Tech Stack

### Frontend
- React 18.2 - UI framework
- Vite 5.0 - Build tool & dev server
- Redux Toolkit - State management
- React Router 6.20 - Routing
- Tailwind CSS 3.3 - Styling
- Headless UI - Unstyled UI components
- React Hook Form - Form handling
- React Icons - Icon library
- Sonner - Toast notifications

### Backend/Database
- Supabase - Backend-as-a-Service (PostgreSQL database, auth, APIs)

### Development Tools
- ESLint - Code linting
- PostCSS & Autoprefixer - CSS processing

### Utilities
- Moment.js - Date manipulation
- clsx - Conditional CSS classes

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### 1. Clone and Install Dependencies

```bash
cd "Team Task Manager"
npm install
```

### 2. Setup Supabase

1. Create a new project in [Supabase](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Copy the contents of `supabase-schema.sql` and run it
4. Go to Project Settings > API and copy your:
   - Project URL
   - anon/public key

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server

```bash
npm run dev
```

The app will open at http://localhost:3000

## Database Schema

### Tables

- **profiles** - User profiles (extends auth.users)
- **teams** - Team information
- **team_members** - Team membership with roles (admin/member)
- **tasks** - Tasks belonging to teams

### Row Level Security

- Users can only see teams they're members of
- Only team members can view/create/edit team tasks
- Only admins can add/remove team members
- Proper foreign key constraints

## Usage

1. **Register** - Create a new account
2. **Login** - Sign in to your account
3. **Create Team** - Click the + button to create a new team
4. **Share Team ID** - Share your Team ID with others to let them join
5. **Join Team** - Click the group icon to join an existing team by ID
6. **Create Tasks** - Add tasks to your team
7. **Update Status** - Change task status (Pending, In Progress, Completed)
8. **Manage Members** - Admins can add/remove team members

## Project Structure

```
src/
├── components/
│   ├── auth/           # Auth route guards
│   ├── members/        # Member management components
│   ├── tasks/          # Task components
│   └── teams/          # Team components
├── lib/
│   └── supabase.js     # Supabase client
├── pages/
│   ├── auth/           # Login & Register pages
│   └── dashboard/      # Main dashboard
├── store/
│   ├── slices/         # Redux slices
│   └── store.js        # Redux store configuration
├── App.jsx             # Main app with routing
├── index.css           # Global styles
└── main.jsx            # Entry point
```

## License

MIT

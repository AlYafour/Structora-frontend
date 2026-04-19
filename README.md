# Frontend - Multi-Tenant Project Management System

A modern React-based frontend application for managing construction projects with multi-tenant support, role-based access control, and enterprise-grade features.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Features](#features)
- [Architecture](#architecture)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Testing](#testing)
- [Contributing](#contributing)

## 🎯 Overview

This frontend provides a comprehensive user interface for:
- Multi-tenant project management
- Role-based access control (RBAC)
- Project lifecycle management
- Financial tracking (payments, invoices, variations)
- Document management
- Workflow management
- Real-time updates
- Multi-language support (Arabic/English)
- Dynamic theming per tenant

## 🛠️ Tech Stack

### Core Framework
- **React 19.1.1** - UI library
- **Vite 7.1.7** - Build tool and dev server
- **React Router 7.9.4** - Client-side routing

### UI Components
- **Material-UI (MUI) 7.3.4** - Component library
- **Ant Design 5.12.8** - Additional UI components
- **React Icons 5.5.0** - Icon library
- **Emotion** - CSS-in-JS styling

### State Management & Data Fetching
- **Axios 1.12.2** - HTTP client
- **React Context API** - Global state (Auth, Theme)
- **Custom Hooks** - Reusable state logic

### Internationalization
- **i18next 25.6.0** - Internationalization framework
- **react-i18next 16.1.3** - React bindings for i18next

### Utilities
- **date-fns 4.1.0** - Date manipulation
- **react-datepicker 9.0.0** - Date picker component
- **react-select 5.10.2** - Select component
- **browser-image-compression 2.0.2** - Image compression
- **html2canvas 1.4.1** - HTML to canvas
- **jspdf 4.0.0** - PDF generation
- **@react-pdf/renderer 4.3.2** - React PDF components
- **react-to-print 3.2.0** - Print functionality
- **react-markdown 9.1.0** - Markdown rendering

### Development Tools
- **ESLint 9.36.0** - Code linting
- **TypeScript types** - Type definitions for React

## 📁 Project Structure

```
tenant-project-management-frontend/
├── public/                 # Static assets
│   ├── background.jpg
│   └── logo.png
│
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── common/        # Common components (Button, Card, Dialog, etc.)
│   │   ├── forms/         # Form components (Field, Select, etc.)
│   │   ├── file-upload/   # File upload components
│   │   ├── layout/        # Layout components (Layout, Sidebar, Navbar)
│   │   └── ui/            # UI components
│   │
│   ├── features/          # Feature-based modules
│   │   ├── admin/         # Admin features
│   │   ├── auth/          # Authentication
│   │   ├── company/       # Company management
│   │   ├── consultants/   # Consultant management
│   │   ├── invoices/      # Invoice management
│   │   ├── owners/        # Owner management
│   │   ├── payments/      # Payment management
│   │   ├── projects/      # Project management
│   │   │   ├── pages/     # Project pages
│   │   │   ├── wizard/    # Project wizard
│   │   │   ├── view/      # Project view components
│   │   │   └── components/# Project-specific components
│   │   └── variations/    # Variation management
│   │
│   ├── hooks/             # Custom React hooks
│   │   ├── useProject.js
│   │   ├── useProjectData.js
│   │   ├── useProjectPermissions.js
│   │   ├── useContract.js
│   │   ├── useLicense.js
│   │   ├── useSitePlan.js
│   │   ├── useFileUpload.js
│   │   ├── useDebounce.js
│   │   └── useCache.js
│   │
│   ├── services/          # API service layer
│   │   ├── api.js         # Axios instance & interceptors
│   │   ├── baseService.js # Base service class
│   │   ├── projects/      # Project services
│   │   ├── payments/      # Payment services
│   │   ├── invoices/      # Invoice services
│   │   ├── consultants/    # Consultant services
│   │   ├── owners/         # Owner services
│   │   ├── auth/           # Auth services
│   │   ├── company/        # Company services
│   │   └── admin/          # Admin services
│   │
│   ├── contexts/          # React Context providers
│   │   └── AuthContext.jsx # Authentication context
│   │
│   ├── utils/             # Utility functions
│   │   ├── logger.js      # Centralized logging
│   │   ├── errorHandler.js # Error handling
│   │   ├── formatters.js  # Data formatters
│   │   ├── fileHelpers.js # File utilities
│   │   ├── fileCompression.js # Image compression
│   │   └── ...            # Other utilities
│   │
│   ├── config/            # Configuration
│   │   └── i18n.js        # i18n configuration
│   │
│   ├── styles/            # Global styles
│   ├── pages/             # Page components
│   ├── App.jsx            # Root component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global CSS
│
├── package.json           # Dependencies
├── vite.config.js        # Vite configuration
├── eslint.config.js      # ESLint configuration
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running (see backend README)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tenant-project-management-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Create `.env` file (if needed)
   - Configure API base URL

4. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_ROOT_URL=http://localhost:8000
```

### Vite Configuration

The project uses Vite for:
- Fast HMR (Hot Module Replacement)
- Optimized builds
- Code splitting
- Asset optimization

### API Configuration

API base URL is configured in `src/services/api.js`:
- Development: `/api/` (relative)
- Production: `${ROOT}/api/` (from environment)

## ✨ Features

### Multi-Tenant Support
- Tenant-specific themes and branding
- Tenant isolation
- Dynamic logo and color schemes
- Tenant-specific data filtering

### Authentication & Authorization
- JWT-based authentication
- Automatic token refresh
- Role-based access control
- Permission-based UI rendering
- Protected routes

### Project Management
- Project creation wizard
- Project lifecycle management
- Multi-stage approval workflow
- Project status tracking
- Project categorization
- Contract management

### Financial Management
- Payment tracking
- Invoice management
- Variation orders (change orders)
- Financial calculations
- Payment status tracking

### Document Management
- File upload with progress
- Image compression
- PDF generation
- Document preview
- Secure file access

### Workflow Management
- Awarding process
- Start order management
- Project scheduling
- Excavation notice management

### User Experience
- Multi-language support (Arabic/English)
- RTL support for Arabic
- Responsive design
- Dark/light theme support
- Loading states
- Error handling
- Toast notifications

## 🏗️ Architecture

### Service Layer Pattern

All API calls go through a centralized service layer:

```javascript
// ✅ GOOD: Using service layer
import { projectApi } from '../services';

const project = await projectApi.getById(projectId);
```

```javascript
// ❌ BAD: Direct API calls
import { api } from '../services/api';

const { data } = await api.get(`projects/${projectId}/`);
```

### Error Handling

Unified error handling through `errorHandler` utility:

```javascript
import { handleError } from '../utils/errorHandler';

try {
  await projectApi.create(data);
} catch (error) {
  const handled = handleError(error, 'ProjectService.create');
  // Display error message
}
```

### Logging

Centralized logging service (development only):

```javascript
import { logger } from '../utils/logger';

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message'); // Always logs
```

### State Management

- **Global State**: React Context (Auth, Theme)
- **Local State**: React hooks (useState, useReducer)
- **Server State**: Custom hooks (useProject, useProjectData)

### Component Structure

- **Pages**: Top-level route components
- **Features**: Feature-specific components
- **Components**: Reusable UI components
- **Hooks**: Reusable logic

## 💻 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Development Best Practices

1. **Use Service Layer**: Never call `api` directly in components
2. **Error Handling**: Always use `handleError` utility
3. **Logging**: Use `logger` instead of `console.log`
4. **Code Splitting**: Use lazy loading for routes
5. **Performance**: Memoize expensive computations
6. **Accessibility**: Use semantic HTML
7. **Internationalization**: Use `t()` function for all text

### Code Standards

- **Language**: All code and comments must be in English
- **Components**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions
- **File Structure**: Feature-based organization
- **Imports**: Organized and grouped

## 🏗️ Building for Production

### Build Process

```bash
# Build optimized production bundle
npm run build
```

The build output will be in the `dist/` directory.

### Build Optimization

- Code splitting by route
- Tree shaking
- Minification
- Asset optimization
- Source maps (disabled in production)

### Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy `dist/` directory**
   - Static hosting (Netlify, Vercel, etc.)
   - Or serve with a web server (Nginx, Apache)

3. **Configure API URL**
   - Set `VITE_API_BASE_URL` in build environment
   - Or configure in `vite.config.js`

## 🧪 Testing

### Test Structure

```
tests/
├── components/     # Component tests
├── hooks/         # Hook tests
├── services/      # Service tests
└── integration/   # Integration tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 📝 Contributing

### Code Standards

- **Language**: All code and comments must be in English
- **Style**: Follow ESLint rules
- **Components**: Functional components only
- **Hooks**: Use custom hooks for reusable logic
- **Testing**: Write tests for new features

### Development Workflow

1. Create feature branch
2. Write code following standards
3. Ensure ESLint passes
4. Write tests
5. Update documentation
6. Submit pull request

## 🔧 Troubleshooting

### Common Issues

**API Connection Errors**
- Check API base URL configuration
- Verify CORS settings on backend
- Check network connectivity

**Build Errors**
- Clear `node_modules` and reinstall
- Check Node.js version compatibility
- Verify all dependencies are installed

**Theme Not Applying**
- Check tenant theme API response
- Verify CSS variables are set
- Check browser console for errors

## 📄 License

[Your License Here]

## 📞 Support

For issues and questions, please contact [your contact information]

---

**Last Updated**: 2025
**Version**: 1.0.0

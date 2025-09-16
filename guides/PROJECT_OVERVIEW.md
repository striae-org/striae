# Striae Project Overview

## What is Striae?

Striae is a cloud-native forensic annotation application built specifically for forensic firearms examination. It harnesses global cloud infrastructure (leveraging Cloudflare) to deliver unmatched capabilities in accessibility, security, and operational efficiency for firearms examiners worldwide.

## Project Structure

```
striae/
├── app/                          # Main Remix application
│   ├── components/              # React components
│   ├── routes/                  # Application routes/pages
│   ├── services/               # Firebase and external services
│   ├── utils/                  # Utility functions
│   ├── hooks/                  # Custom React hooks
│   ├── contexts/               # React contexts (auth)
│   └── config/                 # Configuration files
├── workers/                     # Cloudflare Workers
│   ├── user-worker/            # User data management
│   ├── image-worker/           # Image upload/management
│   ├── pdf-worker/             # PDF generation
│   ├── data-worker/            # Case data management
│   ├── keys-worker/            # API key management
│   └── turnstile-worker/       # CAPTCHA verification
├── public/                     # Static assets
├── guides/                     # Documentation (this directory)
└── functions/                  # Cloudflare Pages Functions
```

## Tech Stack

### Frontend
- **Framework**: Remix (React-based full-stack framework)
- **Styling**: CSS Modules + Tailwind CSS
- **Type Safety**: TypeScript
- **Authentication**: Firebase Auth with MFA support
- **State Management**: React hooks and context

### Backend/Infrastructure
- **Platform**: Cloudflare Pages + Workers
- **Database**: Cloudflare KV (Key-Value storage)
- **Data Storage**: Cloudflare R2 (Object storage)
- **File Storage**: Cloudflare Images
- **Authentication**: Firebase Authentication
- **Build Tool**: Vite
- **Deployment**: Wrangler (Cloudflare CLI)

### Key Features
- **Canvas-based annotation system** for comparison image annotation
- **Case management** with file organization
- **PDF report generation** with annotations
- **Multi-factor authentication** for security
- **Real-time image annotation** with various marking features
- **Cloud-native architecture** for global accessibility and scalability

## Development Philosophy

Striae is built with several key principles:

1. **Security First**: Every component implements security best practices
2. **User Experience**: Intuitive interface designed for forensic firearms examiners
3. **Performance**: Optimized for handling high-resolution comparison images
4. **Scalability**: Cloud-native architecture that scales globally
5. **Compliance**: Built with forensic evidence handling requirements in mind

## Key Differentiators

- **Specialized for Firearms Examination**: Unlike general forensic tools, Striae is purpose-built for firearms examination
- **Cloud-Native**: No local infrastructure required
- **Global Accessibility**: Available anywhere with internet connection
- **Advanced Security**: Multi-layer security including MFA, encryption, and access controls
- **Modern Architecture**: Built on latest web technologies for performance and maintainability

## Getting Started

For new developers joining the project:

1. Read this overview to understand the project scope
2. Follow the [Installation Guide](https://developers.striae.org/striae-dev/get-started/installation-guide) to set up your development environment
3. Review the [Architecture Guide](https://developers.striae.org/striae-dev/get-started/project-overview/striae-architecture) to understand the system design
4. Study the [Error Handling Guide](https://developers.striae.org/striae-dev/guides/error-handling) for proper error management patterns
5. Check the [API Documentation](https://developers.striae.org/striae-dev/guides/api-reference) for backend integrations
6. Explore the [Component Guide](https://developers.striae.org/striae-dev/guides/components) for frontend development

## Project Status

Striae is currently in **Beta** (v0.9.15.1-beta) with active development. The beta period ends January 1, 2026. The project is actively maintained and welcomes contributions from the forensic technology community.

---

## Support

For support and questions:
- **Documentation**: [Striae Documentation](https://developers.striae.org/striae-dev/get-started/document-index)
- **Support Portal**: [Striae Support](https://www.striae.org/support)
- **Discord**: [Striae on Discord](https://discord.gg/ESUPhTPwHx)

---

## License

This project is licensed under Apache 2.0. Please refer to the LICENSE and NOTICE files for more information.

---

## Credits

This project was entirely designed and developed by [Stephen J. Lu](https://www.stephenjlu.com)

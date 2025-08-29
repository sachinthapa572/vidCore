# vidCore

A comprehensive video platform backend built with modern technologies, providing a robust API for video content management, user authentication, social features, and advanced media processing capabilities.

this project is the part of learing the Backend Development

## 🛠️ Technology Stack

### Runtime & Framework

- **Bun**: High-performance JavaScript runtime
- **Hono**: Fast, lightweight web framework for Cloudflare Workers and more
- **TypeScript**: Type-safe JavaScript with full type checking

### Database & Storage

- **MongoDB**: NoSQL database with Mongoose ODM
- **ImageKit**: Cloud-based image and video optimization
- **AWS S3**: Scalable cloud storage (optional)
- **Local Storage**: File system storage for development

### Processing & Jobs

- **Agenda.js**: Lightweight job scheduling library for MongoDB
- **Fluent-FFmpeg**: Video processing and metadata extraction
- **MongoDB Memory Server**: In-memory MongoDB for testing

### Validation & Security

- **Zod**: TypeScript-first schema validation
- **JWT**: JSON Web Token authentication
- **Argon2**: Secure password hashing

## 📋 Prerequisites

- **Node.js**: >= 18.0.0 or **Bun**: >= 1.0.0
- **MongoDB**: >= 5.0.0
- **FFmpeg**: For video processing
- **ImageKit Account**: For media storage and optimization

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/sachinthasachintha/vidCore.git
   cd vidCore
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
4. **Run the application**

   ```bash
   # Development mode with hot reload
   bun run dev

   # Production build
   bun run build
   ```

## 📖 Usage

### API Endpoints

The API is organized into the following main routes:

#### Authentication (`/users/`)

- `POST /users/register` - User registration
- `POST /users/login` - User login
- `POST /users/logout` - User logout (authenticated)
- `POST /users/refresh-token` - Refresh access token
- `GET /users/current-user` - Get current user profile
- `PATCH /users/update-password` - Change password
- `PATCH /users/update-image` - Update avatar/cover image
- `PATCH /users/update-account` - Update account details

#### Videos (`/videos/`)

- `GET /videos/` - Get all videos (with pagination, filtering, sorting)
- `POST /videos/` - Upload new video
- `GET /videos/:id` - Get video by ID
- `GET /videos/status/:id` - Get video upload status
- `PATCH /videos/:id` - Update video details
- `DELETE /videos/:id` - Delete video (soft delete)
- `PATCH /videos/toggle/publish/:id` - Toggle publish status
- `PATCH /videos/cancel-delete/:id` - Cancel soft delete
- `POST /videos/watch/:id` - Increment video views

#### Comments (`/comments/`)

- `GET /comments/?videoId={videoId}` - Get comments for a video
- `POST /comments/` - Create new comment
- `PATCH /comments/:id` - Update comment
- `DELETE /comments/:id` - Delete comment

#### Subscriptions (`/subscriptions/`)

- `GET /subscriptions/?subscriber={userId}` - Get user subscriptions
- `POST /subscriptions/` - Subscribe to channel
- `DELETE /subscriptions/:id` - Unsubscribe from channel

#### Playlists (`/playlists/`)

- `GET /playlists/?userId={userId}` - Get user playlists
- `POST /playlists/` - Create new playlist
- `GET /playlists/:id` - Get playlist by ID
- `PATCH /playlists/:id` - Update playlist
- `DELETE /playlists/:id` - Delete playlist
- `POST /playlists/:id/videos` - Add video to playlist
- `DELETE /playlists/:id/videos/:videoId` - Remove video from playlist

#### Likes (`/likes/`)

- `GET /likes/?userId={userId}&videoId={videoId}` - Get like status
- `POST /likes/` - Like/unlike video
- `GET /likes/videos/?userId={userId}` - Get user's liked videos

#### Tweets (`/tweets/`)

- `GET /tweets/?userId={userId}` - Get user tweets
- `POST /tweets/` - Create new tweet
- `PATCH /tweets/:id` - Update tweet
- `DELETE /tweets/:id` - Delete tweet

#### Dashboard (`/dashboard/`)

- `GET /dashboard/stats` - Get dashboard statistics
- `GET /dashboard/videos` - Get user's videos for dashboard
- `GET /dashboard/analytics` - Get user analytics

#### Health Check (`/`)

- `GET /health` - Comprehensive health check

## 🏗️ Project Structure

```
vidCore/
├── src/
│   ├── app/
│   │   ├── app.ts              # Main application setup
│   │   ├── create-app.ts       # App factory
│   │   └── server.ts           # Server entry point
│   ├── config/
│   │   ├── agenda.ts           # Job scheduling configuration
│   │   ├── imagekit.ts         # ImageKit configuration
│   │   └── storage.config.ts   # Storage configuration
│   ├── db/
│   │   ├── database.config.ts  # Database connection
│   │   ├── env.ts              # Environment variables
│   │   └── models/             # Database models
│   │       ├── user.model.ts
│   │       ├── video.model.ts
│   │       ├── comment.model.ts
│   │       └── ...
│   ├── middlewares/
│   │   ├── error.middlewares.ts
│   │   └── is-authmiddleware.ts
│   ├── routes/                 # API route handlers
│   │   ├── user.route.ts
│   │   ├── video.route.ts
│   │   ├── comment.route.ts
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── auth.service.ts
│   │   ├── video.service.ts
│   │   ├── user.service.ts
│   │   └── ...
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   ├── validation/             # Input validation schemas
│   └── enum/                   # Constants and enums
├── .env.example                # Environment variables template
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── biome.json                  # Code formatting configuration
└── README.md                   # This file
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run code quality checks**
   ```bash
   bun run check
   bun run format
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Write clear, concise commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all checks pass before submitting PR

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hono** - Fast web framework
- **Bun** - High-performance JavaScript runtime
- **MongoDB** - NoSQL database
- **ImageKit** - Media optimization and delivery
- **Agenda.js** - Job scheduling
- **FFmpeg** - Video processing

---

**Author**: Sachin Thapa
**Repository**: [https://github.com/sachinthasachintha/vidCore](https://github.com/sachinthasachintha/vidCore)
**Version**: 1.0.0

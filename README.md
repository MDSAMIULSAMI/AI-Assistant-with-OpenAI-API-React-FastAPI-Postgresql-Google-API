# AI Assistant with OpenAI API

A full-stack AI assistant application that integrates Google OAuth authentication, dynamic OpenAI model selection, and Google Calendar event management through natural language prompts.

## Features

- 🔐 **Google OAuth Authentication** - Secure sign-in with Google accounts
- 🤖 **Dynamic AI Model Selection** - Automatically selects the best OpenAI model based on user prompts:
  - GPT-3.5 Turbo
  - GPT-4o
  - GPT-4o-mini
  - DALL-E 3 (for image generation)
  - GPT-4o Search Preview
- 📅 **Google Calendar Integration** - Add events to Google Calendar via natural language
- 💾 **PostgreSQL Database** - Persistent data storage
- ⚡ **FastAPI Backend** - High-performance Python API
- ⚛️ **React Frontend** - Modern, responsive user interface

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - Database ORM
- **Google APIs** - OAuth & Calendar integration
- **OpenAI API** - AI model access
- **LangChain** - AI application framework

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework

## Prerequisites

Before setting up the project, ensure you have:

- Python 3.8+ installed
- Node.js 16+ and npm/yarn
- PostgreSQL database running
- Google Cloud Console project
- OpenAI API account

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-assistant-app
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

#### Environment Configuration

Create a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/db-name
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/callback
OPENAI_API_KEY=your-openai-api-key
JWT_SECRET=your-secret-key
LANGCHAIN_API_KEY=your-langchain-api-key
```

**Note**: Replace all placeholder values with your actual credentials.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Google Cloud Console Configuration

#### Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google+ API
   - Google Calendar API
   - Google OAuth2 API

#### Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Configure the OAuth consent screen:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5173/callback`
4. Copy the **Client ID** and **Client Secret** to your `.env` file

#### Service Account (Optional for Calendar API)

1. Create a service account for server-to-server Calendar API calls
2. Download the JSON key file
3. Set the path in your environment or use OAuth flow

### 5. OpenAI API Setup

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Generate an API key
3. Add the key to your `.env` file as `OPENAI_API_KEY`

### 6. LangChain Setup (Optional)

1. Sign up at [LangChain](https://www.langchain.com/)
2. Get your API key
3. Add it to your `.env` file as `LANGCHAIN_API_KEY`

## Running the Application

### Start the Backend Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Natural Language Calendar Events

```
"Schedule a team meeting tomorrow at 2 PM for 1 hour"
"Add dentist appointment next Friday at 10 AM"
"Create a reminder for mom's birthday on March 15th"
```

### AI Model Selection

The system automatically selects the appropriate model:
- **GPT-4o**: Complex reasoning, analysis, coding
- **GPT-3.5 Turbo**: General conversation, quick responses
- **GPT-4o-mini**: Simple tasks, fast responses
- **DALL-E 3**: Image generation requests
- **GPT-4o Search Preview**: Current events, real-time information

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `LANGCHAIN_API_KEY` | LangChain API key | Optional |

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Verify DATABASE_URL format
   - Check database permissions

2. **Google OAuth Error**
   - Verify redirect URIs in Google Console
   - Check client ID and secret
   - Ensure APIs are enabled

3. **OpenAI API Error**
   - Verify API key validity
   - Check usage limits and billing
   - Ensure correct model names

4. **Calendar Permission Error**
   - Grant calendar access during OAuth
   - Verify Calendar API is enabled
   - Check OAuth scopes

### Debug Mode

Run the backend in debug mode:

```bash
uvicorn main:app --reload --log-level debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security Considerations

- Keep all API keys secure and never commit them to version control
- Use environment variables for sensitive configuration
- Implement proper rate limiting for API endpoints
- Validate and sanitize all user inputs
- Use HTTPS in production environments

## Deployment

### Production Environment Variables

Update your `.env` for production:

```env
DATABASE_URL=postgresql://user:password@your-db-host:5432/dbname
GOOGLE_REDIRECT_URI=https://yourdomain.com/callback
JWT_SECRET=your-production-secret-key
```

### Docker Deployment (Optional)

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## Support

For issues and questions:
- Check the [Issues](../../issues) section
- Review the troubleshooting guide above
- Contact the development team

---

**Note**: This application handles sensitive user data. Ensure proper security measures are implemented before deploying to production.
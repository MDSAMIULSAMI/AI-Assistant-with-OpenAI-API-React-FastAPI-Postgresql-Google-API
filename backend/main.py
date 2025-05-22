# main.py
from fastapi import FastAPI, Depends, HTTPException, status, Cookie, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, create_engine, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import requests
from datetime import datetime, timedelta
import jwt
from dotenv import load_dotenv
import uuid

# Import agent handler functionality
from agent_handler import process_unified_request

# Load environment variables
load_dotenv()

# Database configuration
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://username:password@localhost/auth_app")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/callback")

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 30

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    picture = Column(String)
    google_id = Column(String, unique=True)
    refresh_token = Column(String)  # To store Google refresh token
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship with chat history
    chat_messages = relationship("ChatHistory", back_populates="user")

# Chat History Model
class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String, index=True, nullable=False)
    message_type = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    actions = Column(JSON, nullable=True)  # Store actions as JSON
    session_title = Column(String, nullable=True)  # Session title
    
    # Relationships
    user = relationship("User", back_populates="chat_messages")

# Create tables
Base.metadata.create_all(bind=engine)

# Schemas
class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    google_id: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    prompt: str
    message_history: List[Message] = []
    session_id: Optional[str] = None

class UnifiedChatRequest(BaseModel):
    request: ChatRequest
    token: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    actions: list = []
    session_id: str

class ChatHistoryResponse(BaseModel):
    id: int
    message_type: str
    content: str
    actions: Optional[List[Dict[str, Any]]] = None
    timestamp: datetime
    session_title: Optional[str] = None
    
    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    session_id: str
    title: str
    last_activity: datetime

# Calendar event schemas
class CalendarEventBase(BaseModel):
    summary: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    timezone: str = "UTC"

class CalendarEventResponse(BaseModel):
    id: str
    summary: str
    description: Optional[str] = None
    location: Optional[str] = None
    start: dict
    end: dict
    htmlLink: str
    creator: Optional[dict] = None

# Image generation schemas
class ImageGenerationRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"
    quality: str = "standard"
    style: str = "vivid"

class ImageGenerationResponse(BaseModel):
    url: str
    revised_prompt: Optional[str] = None

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Chat History Service Functions
def store_message(
    db: Session,
    user_id: Optional[int],
    session_id: str,
    message_type: str,
    content: str,
    actions: Optional[List[dict]] = None
) -> ChatHistory:
    """
    Store a message in the chat history
    
    Args:
        db: Database session
        user_id: User ID (can be None for unauthenticated users)
        session_id: Session identifier for grouping conversations
        message_type: 'user' or 'assistant'
        content: Message content
        
    Returns:
        Created ChatHistory object
    """
    chat_message = ChatHistory(
        user_id=user_id,
        session_id=session_id,
        message_type=message_type,
        content=content,
        actions=actions if actions else None
    )
    
    db.add(chat_message)
    db.commit()
    db.refresh(chat_message)
    
    return chat_message

def get_user_chat_history(
    db: Session,
    user_id: int,
    limit: int = 50,
    skip: int = 0
) -> List[ChatHistory]:
    """
    Get chat history for a specific user
    
    Args:
        db: Database session
        user_id: User ID to retrieve history for
        limit: Maximum number of messages to return
        skip: Number of messages to skip (for pagination)
        
    Returns:
        List of ChatHistory objects
    """
    return db.query(ChatHistory)\
        .filter(ChatHistory.user_id == user_id)\
        .order_by(ChatHistory.timestamp.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

def get_session_chat_history(
    db: Session,
    session_id: str,
    limit: int = 20
) -> List[ChatHistory]:
    """
    Get chat history for a specific session
    
    Args:
        db: Database session
        session_id: Session identifier
        limit: Maximum number of messages to return
        
    Returns:
        List of ChatHistory objects ordered by timestamp (oldest first)
    """
    return db.query(ChatHistory)\
        .filter(ChatHistory.session_id == session_id)\
        .order_by(ChatHistory.timestamp.asc())\
        .limit(limit)\
        .all()

def get_recent_sessions(
    db: Session,
    user_id: int,
    limit: int = 10
) -> List[Dict]:
    """
    Get recent chat sessions for a user
    
    Args:
        db: Database session
        user_id: User ID to retrieve sessions for
        limit: Maximum number of sessions to return
        
    Returns:
        List of session information dictionaries
    """
    # Query for distinct session IDs with their latest timestamp
    query = db.query(
        ChatHistory.session_id,
        func.max(ChatHistory.timestamp).label("last_activity")
    ).filter(
        ChatHistory.user_id == user_id
    ).group_by(
        ChatHistory.session_id
    ).order_by(
        func.max(ChatHistory.timestamp).desc()
    ).limit(limit)
    
    sessions = []
    for session_id, last_activity in query:
        # Get the first message from the user in this session
        first_user_msg = db.query(ChatHistory).filter(
            ChatHistory.session_id == session_id,
            ChatHistory.message_type == 'user'
        ).order_by(ChatHistory.timestamp.asc()).first()
        
        title = "Chat session"
        if first_user_msg:
            # Use the first few words of the first message as the title
            title = first_user_msg.content[:30] + "..." if len(first_user_msg.content) > 30 else first_user_msg.content
        
        sessions.append({
            "session_id": session_id,
            "title": title,
            "last_activity": last_activity
        })
    
    return sessions

def create_new_session() -> str:
    """
    Create a new unique session ID
    
    Returns:
        Session ID string
    """
    return str(uuid.uuid4())

def format_history_for_openai(chat_history: List[ChatHistory]) -> List[Dict[str, str]]:
    """
    Convert chat history to OpenAI message format
    
    Args:
        chat_history: List of ChatHistory objects
        
    Returns:
        List of message dictionaries in OpenAI format
    """
    messages = []
    for msg in chat_history:
        role = "user" if msg.message_type == "user" else "assistant"
        messages.append({
            "role": role,
            "content": msg.content
        })
    return messages

def update_session_title(db: Session, session_id: str, first_message: str) -> None:
    """
    Update the title of a chat session based on the first message
    
    Args:
        db: Database session
        session_id: ID of the session to update
        first_message: First message content to derive title from
    """
    # Truncate the message to create a title (first 50 chars or to the first newline)
    title = first_message.strip()
    title = title.split('\n')[0]  # Get first line
    
    if len(title) > 50:
        title = title[:47] + "..."
    
    # Find all messages in this session
    messages = get_session_chat_history(db, session_id)
    
    # Update all messages to have the same title in the metadata
    # This is a workaround since we don't have a separate sessions table
    for message in messages:
        if message.user_id is not None:
            # Only update messages with a user association
            message.session_title = title
    
    db.commit()

# Functions for Google OAuth and token handling
def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """Exchange the authorization code for access and refresh tokens"""
    token_url = "https://oauth2.googleapis.com/token"
    
    payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": GOOGLE_REDIRECT_URI
    }
    
    response = requests.post(token_url, data=payload)
    if response.status_code == 200:
        return response.json()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange code for tokens"
        )

def refresh_google_token(refresh_token: str) -> Dict[str, Any]:
    """Refresh the Google access token using a refresh token"""
    token_url = "https://oauth2.googleapis.com/token"
    
    payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    
    try:
        response = requests.post(token_url, data=payload)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to refresh token: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error refreshing token: {e}")
        return None

def get_user_info(access_token: str) -> Dict[str, Any]:
    """Get user information using the access token"""
    user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.get(user_info_url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get user info"
        )

# FastAPI app
app = FastAPI(title="AI Assistant API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_google_access_token(refresh_token: str):
    """Get a fresh Google access token using the stored refresh token"""
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    
    response = requests.post(token_url, data=payload)
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh Google access token"
        )
    
    return response.json().get("access_token")

def get_or_create_user(db: Session, user_data: dict):
    # Check if user exists
    user = db.query(User).filter(User.google_id == user_data["google_id"]).first()
    
    if not user:
        # Create new user
        user = User(
            email=user_data["email"],
            name=user_data["name"],
            picture=user_data["picture"],
            google_id=user_data["google_id"]
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user

# Dependency to get current user from token
def get_current_user(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
        
    return user

# Dependency to get current user and their refresh token
def get_current_user_with_token(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    
    if not user.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has not granted calendar access",
        )
    
    return user

# Helper to get session ID from request or create new one
def get_or_create_session_id(request: Request, session_id: Optional[str] = None):
    if session_id:
        return session_id
        
    # Try to get from cookies
    cookies = request.cookies
    session_id = cookies.get("chat_session_id")
    
    if not session_id:
        session_id = create_new_session()
        
    return session_id

# Routes
@app.get("/")
async def root():
    return {"message": "AI Assistant API is running"}

@app.get("/api/auth/google/url")
async def google_auth_url():
    """Generate Google OAuth URL"""
    auth_url = "https://accounts.google.com/o/oauth2/auth"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile https://www.googleapis.com/auth/calendar",
        "access_type": "offline",
        "prompt": "consent",
    }
    
    # Build the URL with parameters
    url = auth_url + "?" + "&".join([f"{key}={value}" for key, value in params.items()])
    return {"url": url}

@app.post("/api/auth/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    # Exchange authorization code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": GOOGLE_REDIRECT_URI,
    }
    
    token_response = requests.post(token_url, data=token_payload)
    
    if token_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not validate Google credentials",
        )
    
    token_data = token_response.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")  # This will only be present if 'prompt=consent' was used
    
    # Get user info from Google
    userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    userinfo_response = requests.get(userinfo_url, headers=headers)
    
    if userinfo_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve user information",
        )
    
    userinfo = userinfo_response.json()
    
    # Create or get user
    user_data = {
        "email": userinfo["email"],
        "name": userinfo.get("name", ""),
        "picture": userinfo.get("picture", ""),
        "google_id": userinfo["id"],
        "refresh_token": refresh_token,  # Store refresh token
    }
    
    # Check if user exists
    user = db.query(User).filter(User.google_id == user_data["google_id"]).first()
    
    if not user:
        # Create new user
        user = User(
            email=user_data["email"],
            name=user_data["name"],
            picture=user_data["picture"],
            google_id=user_data["google_id"],
            refresh_token=user_data["refresh_token"]
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif refresh_token:  # Update refresh token if we got a new one
        user.refresh_token = refresh_token
        db.commit()
        db.refresh(user)
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user.email})
    
    user_response = UserResponse.from_orm(user)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )
    
@app.get("/api/user/me", response_model=UserResponse)
async def get_current_user_endpoint(token: str, db: Session = Depends(get_db)):
    """Get current user information"""
    user = get_current_user(token, db)
    return user

# Chat history endpoints
@app.get("/api/chat/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(token: str, db: Session = Depends(get_db)):
    """Get recent chat sessions for the authenticated user"""
    user = get_current_user(token, db)
    sessions = get_recent_sessions(db, user.id)
    return sessions

@app.get("/api/chat/history/{session_id}", response_model=List[ChatHistoryResponse])
async def get_chat_history(
    session_id: str,
    token: str,
    db: Session = Depends(get_db)
):
    """Get chat history for a specific session"""
    user = get_current_user(token, db)
    history = get_session_chat_history(db, session_id)
    
    # Verify that this session belongs to this user
    if history and history[0].user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this chat session"
        )
    
    return history

# List calendar events
@app.get("/api/calendar/events", response_model=list[CalendarEventResponse])
async def list_calendar_events(
    token: str,
    timeMin: Optional[str] = None,
    timeMax: Optional[str] = None,
    db: Session = Depends(get_db)
):
    user = get_current_user_with_token(token, db)
    access_token = get_google_access_token(user.refresh_token)
    
    calendar_api_url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    params = {}
    if timeMin:
        params["timeMin"] = timeMin
    if timeMax:
        params["timeMax"] = timeMax
    
    response = requests.get(calendar_api_url, headers=headers, params=params)
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch calendar events"
        )
    return response.json().get("items", [])

# Create calendar event
@app.post("/api/calendar/events", response_model=CalendarEventResponse)
async def create_calendar_event(
    token: str,
    event: CalendarEventBase,
    db: Session = Depends(get_db)
):
    user = get_current_user_with_token(token, db)
    access_token = get_google_access_token(user.refresh_token)
    
    calendar_api_url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Format the event payload for Google Calendar API
    payload = {
        "summary": event.summary,
        "description": event.description,
        "location": event.location,
        "start": {
            "dateTime": event.start_datetime.isoformat(),
            "timeZone": event.timezone
        },
        "end": {
            "dateTime": event.end_datetime.isoformat(),
            "timeZone": event.timezone
        }
    }
    
    response = requests.post(calendar_api_url, headers=headers, json=payload)
    
    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create calendar event"
        )
    
    return response.json()

# Get specific calendar event
@app.get("/api/calendar/events/{event_id}", response_model=CalendarEventResponse)
async def get_calendar_event(
    token: str,
    event_id: str,
    db: Session = Depends(get_db)
):
    user = get_current_user_with_token(token, db)
    access_token = get_google_access_token(user.refresh_token)
    
    calendar_api_url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.get(calendar_api_url, headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found"
        )
    
    return response.json()

# Update calendar event
@app.patch("/api/calendar/events/{event_id}", response_model=CalendarEventResponse)
async def update_calendar_event(
    token: str,
    event_id: str,
    event: CalendarEventBase,
    db: Session = Depends(get_db)
):
    user = get_current_user_with_token(token, db)
    access_token = get_google_access_token(user.refresh_token)
    
    calendar_api_url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Format the event payload for Google Calendar API
    payload = {
        "summary": event.summary,
        "description": event.description,
        "location": event.location,
        "start": {
            "dateTime": event.start_datetime.isoformat(),
            "timeZone": event.timezone
        },
        "end": {
            "dateTime": event.end_datetime.isoformat(),
            "timeZone": event.timezone
        }
    }
    
    response = requests.patch(calendar_api_url, headers=headers, json=payload)
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update calendar event"
        )
    
    return response.json()

# Delete calendar event
@app.delete("/api/calendar/events/{event_id}", status_code=204)
async def delete_calendar_event(
    token: str,
    event_id: str,
    db: Session = Depends(get_db)
):
    user = get_current_user_with_token(token, db)
    access_token = get_google_access_token(user.refresh_token)
    
    calendar_api_url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.delete(calendar_api_url, headers=headers)
    
    if response.status_code not in (200, 204):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete calendar event"
        )
    
    return None

# Process unified chat request
@app.post("/api/chat", response_model=ChatResponse)
async def process_chat(request: UnifiedChatRequest, db: Session = Depends(get_db)):
    """Process a unified chat request"""
    
    # Extract request components
    prompt = request.request.prompt
    message_history = request.request.message_history
    session_id = request.request.session_id
    token = request.token
    
    user_id = None
    user = None
    
    # Try to get the user if a token is provided
    if token:
        try:
            user = get_current_user(token, db)
            user_id = user.id
        except HTTPException:
            # Continue without user authentication for chat
            pass
    
    # If no session provided, create a new one
    if not session_id:
        session_id = create_new_session()
    
    # Store the user's message
    store_message(db, user_id, session_id, "user", prompt)
    
    # Process the request with the agent handler
    response_text, actions = process_unified_request(prompt, [{"role": m.role, "content": m.content} for m in message_history])
    
    # Update session title after the first message if it's a new session
    if len(get_session_chat_history(db, session_id)) <= 1:  # Only user message exists
        update_session_title(db, session_id, prompt)
    
    # Store the assistant's response
    db_message = store_message(db, user_id, session_id, "assistant", response_text, actions)
    
    # Process any calendar-related actions if user has calendar access
    if user and user.refresh_token:
        try:
            # Get a new access token from the refresh token
            token_response = refresh_google_token(user.refresh_token)
            if token_response and "access_token" in token_response:
                access_token = token_response["access_token"]
                
                # Check if there are any calendar actions that need processing
                for action in actions:
                    if action.get('type') == 'calendar_event_pending':
                        action_id = action.get('id', str(uuid.uuid4()))
                        event_details = action.get('details', {})
                        
                        # API endpoint for Google Calendar
                        calendar_api_url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
                        
                        try:
                            headers = {
                                "Authorization": f"Bearer {access_token}",
                                "Content-Type": "application/json"
                            }
                            
                            # Format the event payload for Google Calendar API
                            payload = {
                                "summary": event_details.get("summary", "Untitled Event"),
                                "description": event_details.get("description", ""),
                                "location": event_details.get("location", ""),
                                "start": {
                                    "dateTime": event_details.get("start_datetime", datetime.utcnow().isoformat()),
                                    "timeZone": event_details.get("timezone", "UTC")
                                },
                                "end": {
                                    "dateTime": event_details.get("end_datetime", (datetime.utcnow() + timedelta(hours=1)).isoformat()),
                                    "timeZone": event_details.get("timezone", "UTC")
                                }
                            }
                            
                            calendar_response = requests.post(calendar_api_url, headers=headers, json=payload)
                            
                            if calendar_response.status_code in (200, 201):
                                # Update the action with the created event details
                                created_event = calendar_response.json()
                                action['type'] = 'calendar_event_created'
                                action['details']['event_id'] = created_event.get('id')
                                action['details']['htmlLink'] = created_event.get('htmlLink')
                                
                                # Add event details from the Google Calendar response
                                # Ensure we capture and provide the htmlLink for the frontend
                                if 'htmlLink' in created_event:
                                    action['details']['htmlLink'] = created_event['htmlLink']
                                
                                # Update the stored message with the new action status
                                updated_actions = [action if a.get('id') == action_id else a for a in actions]
                                db_message.actions = updated_actions
                                db.commit()
                            else:
                                # If creation failed, update the action to reflect this
                                action['type'] = 'calendar_event_failed'
                                action['details']['error'] = f"Failed to create calendar event: {calendar_response.text}"
                                
                                # Update the stored message with the failure status
                                updated_actions = [action if a.get('id') == action_id else a for a in actions]
                                db_message.actions = updated_actions
                                db.commit()
                        except Exception as e:
                            # Handle any errors during calendar event creation
                            action['type'] = 'calendar_event_failed'
                            action['details']['error'] = str(e)
                            
                            # Update the stored message with the error
                            updated_actions = [action if a.get('id') == action_id else a for a in actions]
                            db_message.actions = updated_actions
                            db.commit()
        except HTTPException:
            # If the user doesn't have calendar access or other issues
            for action in actions:
                if action.get('type') == 'calendar_event_pending':
                    action['type'] = 'calendar_event_needs_auth'
    
    return ChatResponse(
        response=response_text,
        actions=actions,
        session_id=session_id
    )

# Create a new chat session
@app.post("/api/chat/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    token: str,
    db: Session = Depends(get_db)
):
    """Create a new chat session for the authenticated user"""
    user = get_current_user(token, db)
    session_id = create_new_session()
    
    # Return a session with placeholder data that will be updated after first message
    return ChatSessionResponse(
        session_id=session_id,
        title="New conversation",
        last_activity=datetime.utcnow()
    )


# Delete a chat session
@app.delete("/api/chat/sessions/{session_id}", status_code=204)
async def delete_chat_session(
    session_id: str,
    token: str,
    db: Session = Depends(get_db)
):
    """Delete a chat session and all associated messages"""
    user = get_current_user(token, db)
    
    # Get messages for this session
    history = get_session_chat_history(db, session_id)
    
    # Verify that this session belongs to this user
    if history and history[0].user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this chat session"
        )
    
    # Delete all messages for this session
    db.query(ChatHistory).filter(
        ChatHistory.session_id == session_id,
        ChatHistory.user_id == user.id
    ).delete()
    
    db.commit()
    
    return None

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
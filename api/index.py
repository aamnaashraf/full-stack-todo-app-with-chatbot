import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, select, Session, Relationship
from dotenv import load_dotenv
from typing import Generator, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import jwt
from jwt import PyJWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import APIRouter
from sqlalchemy.pool import NullPool
from sqlalchemy import Column, create_engine as create_sqlalchemy_engine
from sqlalchemy import JSON
import uuid
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from passlib.context import CryptContext
import bcrypt
from jose import JWTError, jwt as jose_jwt
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import text  

# Load environment variables
load_dotenv()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # For Vercel deployment, provide a fallback or raise an error
    DATABASE_URL = os.getenv("VERCEL_POSTGRES_URL")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL or VERCEL_POSTGRES_URL not found in environment variables")

# Create engine with NullPool for serverless compatibility
engine = create_sqlalchemy_engine(
    DATABASE_URL,
    poolclass=NullPool,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=300,    # Recycle connections after 5 minutes
    echo=False           # Set to True for debugging
)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

# Define models within the same file for Vercel compatibility
class PriorityEnum(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class RecurrenceRuleEnum(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    none = "none"


class MessageRoleEnum(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)

class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)

    # Relationship to todos
    todos: List["Todo"] = Relationship(back_populates="user")
    # Relationship to conversations
    conversations: List["Conversation"] = Relationship(back_populates="user")

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if len(v.encode('utf-8')) > 72:
            raise ValueError("Password must not exceed 72 bytes when encoded")
        return v

class UserRead(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    is_active: bool

class UserUpdate(SQLModel):
    email: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(SQLModel):
    email: str
    password: str

class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime

class TodoBase(SQLModel):
    title: str
    description: Optional[str] = None
    completed: bool = False
    due_date: Optional[datetime] = None
    due_time: Optional[datetime] = None
    priority: Optional[PriorityEnum] = PriorityEnum.medium
    recurrence_rule: Optional[RecurrenceRuleEnum] = RecurrenceRuleEnum.none

    @model_validator(mode="before")
    @classmethod
    def validate_title_not_empty(cls, values):
        if isinstance(values, dict) and values.get("title") == "":
            raise ValueError("Title cannot be empty")
        return values

    @field_validator("due_date", mode="before", check_fields=False)
    @classmethod
    def validate_due_date(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            try:
                # Try to parse the date string (ISO format from frontend)
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                # If ISO format fails, try other formats
                try:
                    return datetime.strptime(v, "%Y-%m-%d")
                except ValueError:
                    try:
                        return datetime.strptime(v, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        raise ValueError("Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or YYYY-MM-DD")
        return v

    @field_validator("due_time", mode="before", check_fields=False)
    @classmethod
    def validate_due_time(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            try:
                # Try to parse the datetime string (ISO format from frontend)
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                # If ISO format fails, try other formats
                try:
                    return datetime.strptime(v, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    try:
                        return datetime.strptime(v, "%H:%M:%S")
                    except ValueError:
                        try:
                            return datetime.strptime(v, "%H:%M")
                        except ValueError:
                            raise ValueError("Invalid time format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or HH:MM")
        return v

class Todo(TodoBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    parent_todo_id: Optional[uuid.UUID] = Field(default=None, foreign_key="todo.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship to user
    user: "User" = Relationship(back_populates="todos")
    # Self-referencing relationship for recurring tasks
    parent_todo: Optional["Todo"] = Relationship(back_populates="child_todos", sa_relationship_kwargs={"remote_side": "Todo.id"})
    child_todos: List["Todo"] = Relationship(back_populates="parent_todo")


class Conversation(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    title: str = Field(max_length=255, default="New Conversation")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)

    # Relationship to messages
    messages: List["Message"] = Relationship(back_populates="conversation")

    # Foreign key relationship to user
    user: "User" = Relationship(back_populates="conversations")


class Message(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    conversation_id: uuid.UUID = Field(foreign_key="conversation.id", index=True)
    role: MessageRoleEnum = Field(index=True)
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    language: Optional[str] = Field(default="en", max_length=10)

    # Use JSON for SQLite compatibility and JSONB for PostgreSQL when deployed
    # The actual column type will be handled by the database migration
    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # Relationships
    conversation: "Conversation" = Relationship(back_populates="messages")

class TodoCreate(TodoBase):
    parent_todo_id: Optional[uuid.UUID] = None

class TodoRead(TodoBase):
    id: uuid.UUID
    user_id: uuid.UUID
    parent_todo_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

class TodoUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    due_date: Optional[datetime] = None
    due_time: Optional[datetime] = None
    priority: Optional[PriorityEnum] = None
    recurrence_rule: Optional[RecurrenceRuleEnum] = None
    parent_todo_id: Optional[uuid.UUID] = None

    @field_validator("due_date", mode="before", check_fields=False)
    @classmethod
    def validate_due_date(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            try:
                # Try to parse the date string (ISO format from frontend)
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                # If ISO format fails, try other formats
                try:
                    return datetime.strptime(v, "%Y-%m-%d")
                except ValueError:
                    try:
                        return datetime.strptime(v, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        raise ValueError("Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or YYYY-MM-DD")
        return v

    @field_validator("due_time", mode="before", check_fields=False)
    @classmethod
    def validate_due_time(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            try:
                # Try to parse the datetime string (ISO format from frontend)
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                # If ISO format fails, try other formats
                try:
                    return datetime.strptime(v, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    try:
                        return datetime.strptime(v, "%H:%M:%S")
                    except ValueError:
                        try:
                            return datetime.strptime(v, "%H:%M")
                        except ValueError:
                            raise ValueError("Invalid time format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or HH:MM")
        return v

class TodoPublic(TodoBase):
    id: uuid.UUID
    parent_todo_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


# Conversation and Message Pydantic Schemas
class ConversationCreate(SQLModel):
    title: Optional[str] = "New Conversation"


class ConversationRead(SQLModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    is_active: bool


class MessageCreate(SQLModel):
    role: MessageRoleEnum
    content: str
    language: Optional[str] = "en"
    metadata_json: Optional[dict] = None


class MessageRead(SQLModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: MessageRoleEnum
    content: str
    timestamp: datetime
    language: str


class ConversationWithMessages(ConversationRead):
    messages: List[MessageRead] = []

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Security scheme for API docs
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    Truncate the password if it exceeds 72 bytes to avoid bcrypt errors.
    """
    # Truncate the password if it exceeds 71 bytes to avoid bcrypt errors
    if len(plain_password.encode('utf-8')) > 71:
        # Truncate the password string to ensure it fits within 71 bytes
        truncated_password = plain_password
        while len(truncated_password.encode('utf-8')) > 71:
            truncated_password = truncated_password[:-1]
        plain_password = truncated_password

    # Encode both passwords to bytes for comparison
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def get_password_hash(password: str) -> str:
    """
    Hash a password with bcrypt, ensuring it's within the 72-byte limit.
    Bcrypt has a hard limit of 72 bytes, so we truncate if necessary.
    We truncate at character boundaries to avoid splitting multi-byte characters.
    """
    # Validate password length before hashing
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")

    # Ensure the password is within bcrypt's 72-byte limit
    # We truncate to 71 bytes to have a safety margin
    if len(password.encode('utf-8')) > 71:
        # Truncate the password string to ensure it fits within 71 bytes
        # We'll iteratively reduce the string length until it fits
        truncated_password = password
        while len(truncated_password.encode('utf-8')) > 71:
            truncated_password = truncated_password[:-1]
        password = truncated_password

    # Encode password to bytes and hash it with bcrypt
    password_bytes = password.encode('utf-8')
    hashed_bytes = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed_bytes.decode('utf-8')

def authenticate_user(session: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user by email and password
    """
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()

    if not user or not verify_password(password, user.password_hash):
        return None

    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create a JWT access token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt = jose_jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """
    Get the current user from the JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jose_jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")

        if email is None:
            raise credentials_exception

        token_data = TokenData(username=email)
    except JWTError:
        raise credentials_exception

    statement = select(User).where(User.email == token_data.username)
    user = session.exec(statement).first()

    if user is None:
        raise credentials_exception

    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get the current active user
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def create_user(session: Session, user_create: UserCreate) -> User:
    """
    Create a new user with hashed password
    """
    # Hash the password
    hashed_password = get_password_hash(user_create.password)

    # Create the user object
    user = User(
        email=user_create.email,
        password_hash=hashed_password
    )

    # Add to session and commit
    session.add(user)
    session.commit()
    session.refresh(user)

    return user

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

def create_todo(session: Session, todo_create: TodoCreate, user_id: str) -> Todo:
    """
    Create a new todo for a user
    """
    # Use model_dump to ensure all fields are properly transferred
    todo_data = todo_create.model_dump()
    todo = Todo(
        **todo_data,
        user_id=uuid.UUID(user_id)
    )

    session.add(todo)
    session.commit()
    session.refresh(todo)

    return todo

def get_todos(session: Session, user_id: str) -> List[Todo]:
    """
    Get all todos for a specific user
    """
    statement = select(Todo).where(Todo.user_id == uuid.UUID(user_id))
    todos = session.exec(statement).all()
    return todos

def get_todo(session: Session, todo_id: str, user_id: str) -> Todo:
    """
    Get a specific todo by ID for a specific user
    """
    statement = select(Todo).where(Todo.id == uuid.UUID(todo_id), Todo.user_id == uuid.UUID(user_id))
    todo = session.exec(statement).first()

    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )

    return todo

def update_todo(session: Session, todo_id_or_title: str, todo_update: TodoUpdate, user_id: str) -> Todo:
    """
    Update a specific todo by ID or Title for a specific user
    """
    # Try to parse as UUID first
    try:
        todo_id_uuid = uuid.UUID(todo_id_or_title)
        todo = get_todo(session, str(todo_id_uuid), user_id)
    except (ValueError, AttributeError):
        # If not a valid UUID, search by title
        statement = select(Todo).where(Todo.title == todo_id_or_title, Todo.user_id == uuid.UUID(user_id))
        todo = session.exec(statement).first()

        if not todo:
            # Try a case-insensitive search if exact match fails
            statement = select(Todo).where(
                text("LOWER(title) = :title"),
                Todo.user_id == uuid.UUID(user_id)
            ).params(title=todo_id_or_title.lower())
            todo = session.exec(statement).first()

    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo '{todo_id_or_title}' not found"
        )

    # Update the todo with provided values
    update_data = todo_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(todo, field, value)

    session.add(todo)
    session.commit()
    session.refresh(todo)

    return todo

def delete_todo(session: Session, todo_id_or_title: str, user_id: str) -> bool:
    """
    Delete a specific todo by ID or Title for a specific user
    """
    # Try to parse as UUID first
    try:
        todo_id_uuid = uuid.UUID(todo_id_or_title)
        todo = get_todo(session, str(todo_id_uuid), user_id)
    except (ValueError, AttributeError):
        # Search by title
        statement = select(Todo).where(Todo.title == todo_id_or_title, Todo.user_id == uuid.UUID(user_id))
        todo = session.exec(statement).first()

    if not todo:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo '{todo_id_or_title}' not found"
        )

    session.delete(todo)
    session.commit()

    return True

def complete_todo(session: Session, todo_id_or_title: str, user_id: str) -> Todo:
    """
    Complete a todo and handle recurring tasks by ID or Title
    """
    # Try to parse as UUID first
    try:
        todo_id_uuid = uuid.UUID(todo_id_or_title)
        todo = get_todo(session, str(todo_id_uuid), user_id)
    except (ValueError, AttributeError):
        # Search by title
        statement = select(Todo).where(Todo.title == todo_id_or_title, Todo.user_id == uuid.UUID(user_id))
        todo = session.exec(statement).first()

    if not todo:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo '{todo_id_or_title}' not found"
        )

    # Mark as completed
    todo.completed = True
    todo.updated_at = datetime.utcnow()

    session.add(todo)

    # Handle recurring tasks
    if todo.recurrence_rule != RecurrenceRuleEnum.none:
        next_todo = create_next_recurring_todo(session, todo)

    session.commit()
    session.refresh(todo)

    return todo

def create_next_recurring_todo(session: Session, completed_todo: Todo) -> Todo:
    """
    Create the next instance of a recurring todo based on the recurrence rule
    """
    if completed_todo.recurrence_rule == RecurrenceRuleEnum.none:
        return None

    # Calculate next due date based on recurrence rule
    next_due_date = completed_todo.due_date
    if completed_todo.due_date:
        if completed_todo.recurrence_rule == RecurrenceRuleEnum.daily:
            next_due_date = completed_todo.due_date + timedelta(days=1)
        elif completed_todo.recurrence_rule == RecurrenceRuleEnum.weekly:
            next_due_date = completed_todo.due_date + timedelta(weeks=1)
        elif completed_todo.recurrence_rule == RecurrenceRuleEnum.monthly:
            # Simple monthly calculation (adding ~30 days)
            next_due_date = completed_todo.due_date + timedelta(days=30)

    # Create a new todo with the same properties but not completed
    next_todo = Todo(
        title=completed_todo.title,
        description=completed_todo.description,
        completed=False,
        due_date=next_due_date,
        due_time=completed_todo.due_time,
        priority=completed_todo.priority,
        recurrence_rule=completed_todo.recurrence_rule,
        parent_todo_id=completed_todo.id if completed_todo.parent_todo_id is None else completed_todo.parent_todo_id,
        user_id=completed_todo.user_id
    )

    session.add(next_todo)
    session.commit()
    session.refresh(next_todo)

    return next_todo

def get_reminder_todos(session: Session, user_id: str) -> List[Todo]:
    """
    Get todos that have due dates/times for reminder purposes
    """
    # Get all non-completed todos with due dates/times
    statement = select(Todo).where(
        (Todo.user_id == uuid.UUID(user_id)) &
        (Todo.completed == False) &
        ((Todo.due_date.is_not(None)) | (Todo.due_time.is_not(None)))
    )
    todos = session.exec(statement).all()
    return todos


# Conversation and Message CRUD Functions
def create_conversation(session: Session, conversation_create: ConversationCreate, user_id: str) -> Conversation:
    """
    Create a new conversation for a user
    """
    conversation = Conversation(
        **conversation_create.model_dump(),
        user_id=uuid.UUID(user_id)
    )
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


def get_conversations(session: Session, user_id: str) -> List[Conversation]:
    """
    Get all conversations for a specific user
    """
    statement = select(Conversation).where(Conversation.user_id == uuid.UUID(user_id))
    conversations = session.exec(statement).all()
    return conversations


def get_conversation(session: Session, conversation_id: str, user_id: str) -> Conversation:
    """
    Get a specific conversation by ID for a specific user
    """
    statement = select(Conversation).where(
        Conversation.id == uuid.UUID(conversation_id),
        Conversation.user_id == uuid.UUID(user_id)
    )
    conversation = session.exec(statement).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return conversation


def create_message(session: Session, message_create: MessageCreate, conversation_id: str, user_id: str) -> Message:
    """
    Create a new message in a conversation
    """
    # Verify the conversation belongs to the user
    conversation = get_conversation(session, conversation_id, user_id)

    message = Message(
        **message_create.model_dump(),
        conversation_id=uuid.UUID(conversation_id)
    )
    session.add(message)
    # Update conversation's updated_at timestamp
    conversation.updated_at = datetime.utcnow()
    session.add(conversation)
    session.commit()
    session.refresh(message)
    return message


def get_messages(session: Session, conversation_id: str, user_id: str) -> List[Message]:
    """
    Get all messages for a specific conversation that belongs to the user
    """
    # Verify the conversation belongs to the user
    get_conversation(session, conversation_id, user_id)

    statement = select(Message).where(Message.conversation_id == uuid.UUID(conversation_id)).order_by(Message.timestamp)
    messages = session.exec(statement).all()
    return messages


def get_conversation_with_messages(session: Session, conversation_id: str, user_id: str) -> ConversationWithMessages:
    """
    Get a conversation with all its messages
    """
    conversation = get_conversation(session, conversation_id, user_id)
    messages = get_messages(session, conversation_id, user_id)

    return ConversationWithMessages(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        is_active=conversation.is_active,
        messages=[MessageRead(
            id=msg.id,
            conversation_id=msg.conversation_id,
            role=msg.role,
            content=msg.content,
            timestamp=msg.timestamp,
            language=msg.language
        ) for msg in messages]
    )


# Create the FastAPI app
app = FastAPI()

@app.on_event("startup")
def on_startup():
    # In serverless environments, database tables should be pre-created
    # This is just a safety measure for local development
    try:
        # Create all tables defined in SQLModel metadata
        SQLModel.metadata.create_all(engine)
    except Exception as e:
        print(f"Warning: Could not create database tables: {e}")
        print("Make sure your database schema is properly set up.")

# Add CORS middleware with wildcard pattern for Vercel deployments
# This allows all preview deployments from the frontend project
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://full-stack-todo-app-with-chatbot-fr.vercel.app",
        "https://full-stack-todo-frontend-iota.vercel.app",
    ],
    allow_origin_regex=r"https://full-stack-todo-frontend.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Authorization"],
)
# Auth router
auth_router = APIRouter()

@auth_router.post("/api/auth/register", response_model=UserPublic)
def register(user_create: UserCreate, session: Session = Depends(get_session)):
    """
    Register a new user
    """
    # Check if user already exists
    existing_user_statement = select(User).where(User.email == user_create.email)
    existing_user = session.exec(existing_user_statement).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )

    # Create the new user with error handling for debugging
    try:
        user = create_user(session, user_create)
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

    # Return public user data (without password hash)
    return UserPublic(
        id=user.id,
        email=user.email,
        created_at=user.created_at
    )

@auth_router.post("/api/auth/login")
def login(user_credentials: UserLogin, session: Session = Depends(get_session)):
    """
    Login a user and return access token
    """
    user = authenticate_user(
        session=session,
        email=user_credentials.email,
        password=user_credentials.password
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": str(user.id)},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email
        }
    }

@auth_router.post("/api/auth/logout")
def logout():
    """
    Logout a user (currently just a placeholder)
    """
    return {"message": "Successfully logged out"}

# Todo router
todo_router = APIRouter()

@todo_router.get("/api/todos", response_model=List[TodoRead])
def read_todos(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Get all todos for the current user
    """
    todos = get_todos(session, str(current_user.id))
    return todos

@todo_router.post("/api/todos", response_model=TodoRead)
def create_todo_item(
    todo_create: TodoCreate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Create a new todo for the current user
    """
    try:
        todo = create_todo(session, todo_create, str(current_user.id))
        return todo
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to create todo: {str(e)}"
        )

@todo_router.get("/api/todos/{todo_id}", response_model=TodoRead)
def read_todo(
    todo_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Get a specific todo by ID
    """
    todo = get_todo(session, todo_id, str(current_user.id))
    return todo

@todo_router.put("/api/todos/{todo_id}", response_model=TodoRead)
def update_todo_item(
    todo_id: str,
    todo_update: TodoUpdate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Update a specific todo by ID
    """
    todo = update_todo(session, todo_id, todo_update, str(current_user.id))
    return todo

@todo_router.patch("/api/todos/{todo_id}/complete", response_model=TodoRead)
def complete_todo_item(
    todo_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Mark a todo as complete and handle recurring tasks
    """
    todo = complete_todo(session, todo_id, str(current_user.id))
    return todo

@todo_router.get("/api/todos/reminders", response_model=List[TodoRead])
def get_reminder_todos_endpoint(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Get todos with due dates/times for reminder purposes
    """
    todos = get_reminder_todos(session, str(current_user.id))
    return todos

@todo_router.delete("/api/todos/{todo_id}")
def delete_todo_item(
    todo_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Delete a specific todo by ID
    """
    delete_todo(session, todo_id, str(current_user.id))
    return {"message": "Todo deleted successfully"}

# Conversation router
conversation_router = APIRouter()

@conversation_router.post("/api/conversations", response_model=ConversationRead)
def create_conversation_endpoint(
    conversation_create: ConversationCreate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Create a new conversation for the current user
    """
    conversation = create_conversation(session, conversation_create, str(current_user.id))
    return conversation


@conversation_router.get("/api/conversations", response_model=List[ConversationRead])
def read_conversations(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Get all conversations for the current user
    """
    conversations = get_conversations(session, str(current_user.id))
    return conversations


@conversation_router.get("/api/conversations/{conversation_id}", response_model=ConversationWithMessages)
def read_conversation_with_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Get a specific conversation with all its messages
    """
    conversation_with_messages = get_conversation_with_messages(session, conversation_id, str(current_user.id))
    return conversation_with_messages


@conversation_router.post("/api/conversations/{conversation_id}/messages", response_model=MessageRead)
def create_message_endpoint(
    conversation_id: str,
    message_create: MessageCreate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Create a new message in a conversation
    """
    message = create_message(session, message_create, conversation_id, str(current_user.id))
    return message


@conversation_router.get("/api/conversations/{conversation_id}/messages", response_model=List[MessageRead])
def read_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Get all messages for a specific conversation
    """
    messages = get_messages(session, conversation_id, str(current_user.id))
    return messages


# Tool definitions for function calling
def get_todo_tools(current_user_id: str, session: Session):
    """
    Define the tools available for the AI agent to call
    """
    tools = [
        {
            "type": "function",
            "function": {
                "name": "add_todo",
                "description": "Add a new todo task",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "description": "The title of the todo"},
                        "description": {"type": "string", "description": "Optional description of the todo"},
                        "due_date": {"type": "string", "description": "Optional due date in YYYY-MM-DD format"},
                        "due_time": {"type": "string", "description": "Optional due time in HH:MM format"},
                        "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "Priority level"},
                        "recurrence_rule": {"type": "string", "enum": ["daily", "weekly", "monthly", "none"], "description": "Recurrence pattern"}
                    },
                    "required": ["title"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_all_todos",
                "description": "Get all todos for the current user",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_pending_todos",
                "description": "Get all pending (not completed) todos for the current user",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_completed_todos",
                "description": "Get all completed todos for the current user",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "complete_todo",
                "description": "Mark a todo as complete",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "todo_id": {"type": "string", "description": "The ID of the todo to mark as complete"}
                    },
                    "required": ["todo_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "delete_todo",
                "description": "Delete a todo task",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "todo_id": {"type": "string", "description": "The ID of the todo to delete"}
                    },
                    "required": ["todo_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "update_todo",
                "description": "Update an existing todo task",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "todo_id": {"type": "string", "description": "The ID of the todo to update"},
                        "title": {"type": "string", "description": "New title"},
                        "description": {"type": "string", "description": "New description"},
                        "due_date": {"type": "string", "description": "New due date"},
                        "due_time": {"type": "string", "description": "New due time"},
                        "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "New priority level"},
                        "recurrence_rule": {"type": "string", "enum": ["daily", "weekly", "monthly", "none"], "description": "New recurrence pattern"}
                    },
                    "required": ["todo_id"]
                }
            }
        }
    ]

    return tools

def execute_todo_tool(tool_name: str, tool_args: dict, current_user_id: str, session: Session):
    """
    Execute a todo tool with the given arguments
    """
    from datetime import datetime

    if tool_name == "add_todo":
        # Create a TodoCreate object from the arguments, filtering out empty strings
        todo_data = {
            "title": tool_args.get("title"),
            "description": tool_args.get("description"),
            "priority": tool_args.get("priority", "medium"),
            "recurrence_rule": tool_args.get("recurrence_rule", "none")
        }

        # Only add due_date if it's not an empty string
        due_date_val = tool_args.get("due_date")
        if due_date_val and due_date_val.strip():
            todo_data["due_date"] = due_date_val

        # Only add due_time if it's not an empty string
        due_time_val = tool_args.get("due_time")
        if due_time_val and due_time_val.strip():
            todo_data["due_time"] = due_time_val

        todo_create = TodoCreate(**todo_data)
        result = create_todo(session, todo_create, current_user_id)
        return {"success": True, "result": result.dict(), "message": f"Todo '{result.title}' added successfully"}

    elif tool_name == "get_all_todos":
        todos = get_todos(session, current_user_id)
        return {"success": True, "result": [todo.dict() for todo in todos], "message": f"Found {len(todos)} todos"}

    elif tool_name == "get_pending_todos":
        statement = select(Todo).where(
            Todo.user_id == uuid.UUID(current_user_id),
            Todo.completed == False
        )
        todos = session.exec(statement).all()
        return {"success": True, "result": [todo.dict() for todo in todos], "message": f"Found {len(todos)} pending todos"}

    elif tool_name == "get_completed_todos":
        statement = select(Todo).where(
            Todo.user_id == uuid.UUID(current_user_id),
            Todo.completed == True
        )
        todos = session.exec(statement).all()
        return {"success": True, "result": [todo.dict() for todo in todos], "message": f"Found {len(todos)} completed todos"}

    elif tool_name == "complete_todo":
        result = complete_todo(session, tool_args["todo_id"], current_user_id)
        return {"success": True, "result": result.dict(), "message": f"Todo '{result.title}' marked as complete"}

    elif tool_name == "delete_todo":
        success = delete_todo(session, tool_args["todo_id"], current_user_id)
        return {"success": success, "result": {"deleted_id": tool_args["todo_id"]}, "message": "Todo deleted successfully"}

    elif tool_name == "update_todo":
        # Create a TodoUpdate object from the arguments, filtering out empty strings for date/time fields
        filtered_args = {k: v for k, v in tool_args.items() if k != "todo_id"}

        # Remove empty strings for date/time fields to avoid validation errors
        if "due_date" in filtered_args and (not filtered_args["due_date"] or not filtered_args["due_date"].strip()):
            del filtered_args["due_date"]
        if "due_time" in filtered_args and (not filtered_args["due_time"] or not filtered_args["due_time"].strip()):
            del filtered_args["due_time"]

        todo_update = TodoUpdate(**filtered_args)
        result = update_todo(session, tool_args["todo_id"], todo_update, current_user_id)
        return {"success": True, "result": result.dict(), "message": f"Todo '{result.title}' updated successfully"}

    else:
        return {"success": False, "result": None, "message": f"Unknown tool: {tool_name}"}


def detect_language(text: str) -> str:
    """
    Simple language detection based on character sets
    Returns 'ur' for Urdu, 'en' for English
    """
    # Urdu characters are in the Unicode range 0x0600-0x06FF
    urdu_chars = 0
    total_chars = 0

    for char in text:
        if '\u0600' <= char <= '\u06FF':  # Arabic/Persian/Urdu script
            urdu_chars += 1
        if char.isalpha():  # Only count alphabetic characters
            total_chars += 1

    if total_chars > 0 and urdu_chars / total_chars > 0.3:  # If more than 30% are Urdu chars
        return "ur"
    return "en"


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


from groq import AsyncGroq
import json

# Chat endpoint with stateless conversation flow
@conversation_router.post("/api/chat")
async def chat_endpoint(
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Chat endpoint that processes natural language commands and manages todos using function calling
    """
    message = chat_request.message
    conversation_id = chat_request.conversation_id

    print(f"Chat endpoint called with message: {message[:50]}...")  # Debug log
    print(f"Conversation ID: {conversation_id}")  # Debug log
    print(f"Current user ID: {current_user.id}")  # Debug log

    # Get Groq API key from environment
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY not configured in environment variables"
        )

    # Initialize Groq client
    client = AsyncGroq(api_key=groq_api_key)

    # Detect language of the incoming message
    detected_language = detect_language(message)
    print(f"Detected language: {detected_language}")  # Debug log

    # Create or get conversation
    if conversation_id:
        print("Retrieving existing conversation...")  # Debug log
        conversation = get_conversation(session, conversation_id, str(current_user.id))
    else:
        print("Creating new conversation...")  # Debug log
        # Create new conversation
        conversation_create = ConversationCreate(title="AI Assistant Chat")
        conversation = create_conversation(session, conversation_create, str(current_user.id))

    # Create user message with detected language
    user_message = MessageCreate(
        role=MessageRoleEnum.user,
        content=message,
        language=detected_language
    )
    create_message(session, user_message, str(conversation.id), str(current_user.id))
    print("User message saved to DB")  # Debug log

    # Get conversation history
    conversation_history = get_conversation_with_messages(session, str(conversation.id), str(current_user.id))
    print(f"Retrieved {len(conversation_history.messages)} messages from history")  # Debug log

    # Build message history for the AI
    messages = []
    # Add system message with instructions
    system_prompt = f"""
    You are a helpful todo management assistant. You can help users manage their tasks using the available functions.
    Current user ID: {current_user.id}
    Only use the available functions and respond in a helpful, friendly way.
    The user's message is in {'Urdu' if detected_language == 'ur' else 'English'}. Please respond in the same language.
    """

    # Format conversation history for the AI
    for msg in conversation_history.messages:
        role = "user" if msg.role == MessageRoleEnum.user else "assistant"
        messages.append({"role": role, "content": msg.content})

    # Add the current user message
    messages.append({"role": "user", "content": message})
    print(f"Sending {len(messages)} messages to Groq API")  # Debug log

    try:
        # Get the available tools for this user
        tools = get_todo_tools(str(current_user.id), session)
        print(f"Available tools: {len(tools)}")  # Debug log

        # Call the Groq API with function calling
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "system", "content": system_prompt}] + messages,
            model="llama-3.1-8b-instant",  # Updated to currently available model that supports tool calling
            tools=tools,
            tool_choice="auto",  # Allow the model to decide when to use tools
            temperature=0.3,
            max_tokens=1000
        )

        print("Received response from Groq API")  # Debug log

        # Process the response
        response_message = chat_completion.choices[0].message

        # If the model wants to call a tool
        if response_message.tool_calls:
            print(f"Tool calls detected: {len(response_message.tool_calls)}")  # Debug log
            final_response = ""
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                print(f"Executing tool: {function_name} with args: {function_args}")  # Debug log

                try:
                    # Execute the tool
                    tool_result = execute_todo_tool(function_name, function_args, str(current_user.id), session)

                    # Add the result to the final response
                    final_response += f"\n{tool_result['message']}"

                    # If there are multiple results (like in get_all_todos), include them
                    if 'result' in tool_result and isinstance(tool_result['result'], list):
                        if len(tool_result['result']) > 0:
                            final_response += f"\nHere are the details:"
                            for item in tool_result['result'][:5]:  # Limit to first 5 items for brevity
                                if isinstance(item, dict):
                                    title = item.get('title', 'Untitled')
                                    completed = item.get('completed', False)
                                    status = "✓ Completed" if completed else "○ Pending"
                                    final_response += f"\n- {status} {title}"
                except Exception as tool_err:
                    print(f"Error executing tool {function_name}: {str(tool_err)}")
                    final_response += f"\nSorry, I couldn't complete that action: {str(tool_err)}"

        else:
            print("No tool calls, using direct response")  # Debug log
            # If no tool was called, use the model's direct response
            final_response = response_message.content

        # Create assistant message with the same language as the user's message
        assistant_message = MessageCreate(
            role=MessageRoleEnum.assistant,
            content=final_response,
            language=detected_language
        )
        create_message(session, assistant_message, str(conversation.id), str(current_user.id))
        print("Assistant message saved to DB")  # Debug log

        response_data = {
            "conversation_id": str(conversation.id),
            "response": final_response,
            "timestamp": datetime.utcnow(),
            "language": detected_language
        }
        print(f"Returning response: {response_data['response'][:100]}...")  # Debug log
        return response_data

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")  # Debug log
        import traceback
        print(traceback.format_exc())  # Print full traceback
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat: {str(e)}"
        )


# Include API routers
app.include_router(auth_router)
app.include_router(todo_router)
app.include_router(conversation_router)

@app.get("/")
def read_root():
    return {"message": "Todo Web Application API - Deployed on Vercel"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

"""
Database initialization script for Todo Web Application
"""
import os
import sys
from sqlmodel import SQLModel, create_engine
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.pool import NullPool

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

# Import models
from index import User, Todo, Conversation, Message

def init_db():
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL not found in environment variables")

    # Create engine with same configuration as main app (for serverless compatibility)
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,  # Use NullPool for serverless compatibility
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=300,    # Recycle connections after 5 minutes
        echo=True           # Set to True to see SQL statements
    )

    print("Dropping existing tables (if any)...")
    try:
        with engine.connect() as conn:
            # Use transaction to ensure all operations are atomic
            with conn.begin():
                # Check if we're using PostgreSQL to use appropriate syntax
                dialect_name = engine.dialect.name

                if dialect_name == 'postgresql':
                    print("Using PostgreSQL - dropping tables with CASCADE")
                    conn.execute(text("DROP TABLE IF EXISTS message CASCADE"))
                    conn.execute(text("DROP TABLE IF EXISTS conversation CASCADE"))
                    conn.execute(text("DROP TABLE IF EXISTS todo CASCADE"))
                    conn.execute(text('DROP TABLE IF EXISTS "user" CASCADE'))
                else:
                    print(f"Using {dialect_name} - dropping tables individually")
                    # For SQLite and other databases, drop in reverse order of foreign key dependencies
                    conn.execute(text("DROP TABLE IF EXISTS message"))
                    conn.execute(text("DROP TABLE IF EXISTS conversation"))
                    conn.execute(text("DROP TABLE IF EXISTS todo"))
                    conn.execute(text("DROP TABLE IF EXISTS user"))  # Note: no quotes for SQLite

    except Exception as e:
        print(f"Warning: Could not drop existing tables: {e}")

    print("Creating database tables with correct schema...")
    try:
        SQLModel.metadata.create_all(engine)
        print("Database tables created successfully!")

        # Verify tables exist with correct schema (database-agnostic approach)
        with engine.connect() as conn:
            dialect_name = engine.dialect.name

            if dialect_name == 'postgresql':
                # PostgreSQL-specific query
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'message' AND column_name = 'conversation_id'
                """))
            else:
                # SQLite-specific query
                result = conn.execute(text("PRAGMA table_info(message)"))
                columns_info = result.fetchall()
                # Check if 'conversation_id' exists in the columns
                conversation_id_exists = any(col[1] == 'conversation_id' for col in columns_info)

                if conversation_id_exists:
                    print("✓ Verified: message table has conversation_id column")
                else:
                    print("✗ Error: message table does not have conversation_id column!")

            if dialect_name == 'postgresql':
                columns = result.fetchall()
                if columns:
                    print(f"✓ Verified: message table has conversation_id column: {columns[0]}")
                else:
                    print("✗ Error: message table does not have conversation_id column!")

            # List all tables for verification (database-agnostic)
            if dialect_name == 'postgresql':
                result = conn.execute(text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                """))
                tables = [row[0] for row in result.fetchall()]
            else:  # SQLite
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                tables = [row[0] for row in result.fetchall()]

            print(f"✓ Existing tables: {tables}")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
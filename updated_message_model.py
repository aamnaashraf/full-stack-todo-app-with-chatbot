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
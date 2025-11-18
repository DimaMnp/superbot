from beanie import Document, Link
from pydantic import EmailStr, BaseModel, Field
from uuid import UUID, uuid4
from typing import List, Dict

from app.data.schemas import Role, Gender


class Conversation(Document):
    user_id: str
    messages: List[Dict] = []

class User(Document):
    id: UUID = Field(alias="_id", json_schema_extra={"unique": True}, default_factory=uuid4)
    first_name: str
    last_name: str
    password: str
    email: EmailStr
    role: Role
    age: int
    gender: Gender
    history: List[Link[Conversation]] = []


class SecretAdmin(Document):
    """
    SecretAdmin model representing an admin user with additional security attributes.

    Attributes:
        hashed_password (str): Hashed password for the admin user.
    """

    hashed_password: str


class AdminFront(Document):
    """
    AdminFront model representing an admin user for the frontend.

    Attributes:
        username (str): Unique username of the admin.
        disabled (bool): Indicates if the admin account is disabled. Default is False.
        full_name (str): Full name of the admin. Default is None.
        secret (Link[SecretAdmin]): Link to the SecretAdmin document containing security details.
    """

    username: str = Field(json_schema_extra={"unique": True})
    disabled: bool = Field(default=False)
    full_name: str = Field(default=None)
    secret: Link[SecretAdmin] = Field()


class Token(BaseModel):
    """
    Token model representing an access token.

    Attributes:
        access_token (str): The access token string.
        token_type (str): The type of the token, typically "bearer".
    """

    access_token: str
    token_type: str


class TokenData(BaseModel):
    """
    TokenData model representing the data contained in a token.

    Attributes:
        username (str): The username associated with the token.
    """

    username: str







from enum import Enum
from typing import Dict, List
from pydantic import BaseModel, EmailStr


class Gender(Enum):
    male = 'male'
    female = 'female'


class Role(Enum):
    student = "student"
    teacher = 'teacher'
    parent = 'parent'


class UserSchema(BaseModel):
    first_name: str
    last_name: str
    password: str
    email: str
    role: Role
    age: int
    gender: Gender

class UserUpdate(BaseModel):
    new_role: Role
    new_age: int
    new_gender: Gender

class Mail(BaseModel):
    user_id: str
    text: List[Dict] = []

class SendMail(BaseModel):
    # recipient must be specified by email to avoid ambiguous name lookups
    send_to: EmailStr
    text: str


class UserRequest(BaseModel):
    email: str
    password: str


class UserLogIn(BaseModel):
    user_token: str
    
class Conversation(BaseModel):
    user_id: str
    messages: List[Dict] = []


class Token(BaseModel):
    access_token: str
    token_type: str

from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole
from fastapi import APIRouter, WebSocket, Depends
from app.utils.security import get_current_user
from app.utils.security import get_current_user_websocket
from app import GIGA_KEY
from app.utils import prompts
from app.data.models import User, Conversation
from app.data import schemas
from app.utils.error import Error
from typing import List, Dict
from beanie import Link
import uuid
import json

router = APIRouter(prefix="/ai", tags=["AI"])

ca_bundle_file = r"app/russian_trusted_root_ca_pem.crt"

async def save_conversation(user_id: str, new_messages: List[Dict]):
    conversation = await Conversation.find_one(Conversation.user_id == user_id)
    if conversation:

        conversation.messages.extend(new_messages)
        await conversation.save()
    else:
        conversation = Conversation(
            user_id=user_id,
            messages=new_messages
        )
        await conversation.insert()
    user = await User.find_one(User.id == uuid.UUID(user_id), fetch_links=True)
    if not user or not user.history:
        user.history.append(conversation)
        await user.save()
            
async def payloads(payload: str, age: int, gender: str):
    if payload == "student":
        return Chat(
            messages=[
                Messages(
                    role=MessagesRole.SYSTEM,
                    content=prompts.prompts["student"]+f"Учитывай возраст:{age} и пол: {gender}"
                )
            ],
            temperature=0.8,
            max_tokens=10000,
        )
    if payload == "retraining":
        return Chat(
            messages=[
                Messages(
                    role=MessagesRole.SYSTEM,
                    content=prompts.prompts["retraining"]+f"Учитывай возраст:{age} и пол: {gender}"
                )
            ],
            temperature=0.4,
            max_tokens=10000,
        )
    if payload == "teacher":
        return Chat(
            messages=[
                Messages(
                    role=MessagesRole.SYSTEM,
                    content=prompts.prompts["teacher"]+f"Учитывай возраст:{age} и пол: {gender}"
                )
            ],
            temperature=0.6,
            max_tokens=10000,
        )
    if payload == "management":
        return Chat(
            messages=[
                Messages(
                    role=MessagesRole.SYSTEM,
                    content=prompts.prompts["management"]+f"Учитывай возраст:{age} и пол: {gender}"
                )
            ],
            temperature=0.2,
            max_tokens=10000,
        ) 
    
@router.websocket("/")
async def assistant(websocket: WebSocket) -> str:
    await websocket.accept()
    current_user = await get_current_user_websocket(websocket.query_params.get("Authorization"))
    while True:
        user = await User.find_one(User.id == current_user.id)
        if not user:
            raise Error.USER_NOT_FOUND
        if not user.history:
            ai_message = [{
                    "role": "ai",
                    "content": "Привет! Я твой виртуальный помощник Метроша. Чем могу помочь?"
                }]
            await save_conversation(str(user.id), ai_message)
        data = await websocket.receive_text()
        user_message = {
                "role": "user",
                "content": data
            }
        payload = await payloads(str(user.role.value), user.age, str(user.gender.value))
        print(payload)
        with GigaChat(credentials=GIGA_KEY, ca_bundle_file=ca_bundle_file, verify_ssl_certs=False) as giga:
            payload.messages.append(Messages(role=MessagesRole.USER, content=data))
            response = giga.chat(payload)
            payload.messages.append(response.choices[0].message)
            ai_message = {
                "role": "ai",
                "content": response.choices[0].message.content
            }
        await websocket.send_text(response.choices[0].message.content)

        session_messages = []
        session_messages.append(user_message)
        session_messages.append(ai_message)
        await save_conversation(str(user.id), session_messages)
        
@router.delete(
    '/',
    description="delete history",
    responses={
        401: {
            "description": "Unauthorised. You are not authorised to change user"
        }
    }
)
async def remove_history(get_current_user: User = Depends(get_current_user)):
    history = await Conversation.find_one(Conversation.user_id == str(get_current_user.id))
    if not history:
        raise Error.HISTORY_NOT_FOUND
    history.messages = [history.messages[0]]
    await history.save()
        
@router.get(
    '/',
    description="get history",
    responses={
        401: {
            "description": "Unauthorised. You are not authorised to change user"
        }
    }
)
async def get_conversation(get_current_user: User = Depends(get_current_user)) -> schemas.Conversation:
    history = await Conversation.find_one(Conversation.user_id == str(get_current_user.id))
    if not history:
        raise Error.HISTORY_NOT_FOUND
    
    return schemas.Conversation(
        user_id=history.user_id,
        messages=history.messages
    )
        

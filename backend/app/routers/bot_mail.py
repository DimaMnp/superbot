import uuid
from fastapi import APIRouter, Depends

from app.data import schemas
from app.data.models import Mail, User
from app.data.schemas import Role
from app.utils.error import Error
from app.utils.security import get_current_user

router = APIRouter(prefix="/mail", tags=["Mail"])

async def WriteMail(user_id, text):
    userMail = await Mail.find_one(Mail.user_id == str(user_id))
    if userMail:
        userMail.text.extend(text)
        await userMail.save()
    else:
        userMail = Mail(
            user_id=str(user_id),
            text=text
        )
        await userMail.insert()
    user = await User.find_one(User.id == user_id, fetch_links=True)
    if not user:
        return  # User not found, skip linking
    if not user.mail:
        user.mail = []
    if userMail not in user.mail:
        user.mail.append(userMail)
        await user.save()
async def find_user(data):
     
     data_words = data.strip().split()
     if len(data_words) == 2:

       
        user = await User.find_one(
            User.first_name == data_words[0],
            User.last_name == data_words[1]
        )
        
        if not user:
            user = await User.find_one(
                User.first_name == data_words[1],
                User.last_name == data_words[0]
            )
            
        return user
     else:
        user_by_first = await User.find_one(User.first_name == data_words[0])
        if user_by_first:
            return user_by_first
            
        user_by_last = await User.find_one(User.last_name == data_words[0])
        return user_by_last
        
    


@router.get(
        "/",
        description="get mail",
        responses={
            401:{
                "description": "Unauthorised. You are not authorised to get user data"
            }
        })
async def get_mail(get_current_user: User = Depends(get_current_user)) -> schemas.Mail:
    mail_history = await Mail.find_one(Mail.user_id == str(get_current_user.id))
    if not mail_history:
        return schemas.Mail(
            user_id=str(get_current_user.id),
            text=[]
        )
    
    return schemas.Mail(
        user_id=mail_history.user_id,
        text=mail_history.text
    )



@router.post(
        "/",
        description="post mail",
        responses={
            401:{
                "description": "Unauthorised. You are not authorised to make mail"
            }
        })
async def post_mail(data: schemas.SendMail, get_current_user: User = Depends(get_current_user)) -> schemas.Mail:
    if get_current_user.role != Role.teacher:
        raise Error.FORBIDDEN
    
    recipient = await find_user(data.send_to)
    if not recipient:
        raise Error.USER_NOT_FOUND
    
    message = {
        'msg': data.text
    }
    text = []
    text.append(message)
    await WriteMail(recipient.id, text)

    return schemas.Mail(
        user_id=str(recipient.id),
        text=text
    )

    




import uuid
from fastapi import APIRouter, Depends

from app.data import schemas
from app.data.models import Mail, SecretAdmin, User
from app.utils.error import Error
from app.utils.security import get_current_admin, get_current_user

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
    if not user or not user.mail:
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
        raise Error.MAIL_NOT_FOUND
    
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
async def post_mail(data: schemas.SendMail, get_current_admin: SecretAdmin = Depends(get_current_admin)) -> schemas.Mail:
    admin = await SecretAdmin.find_one(SecretAdmin.email == get_current_admin.email)
    if not admin:
        raise Error.FORBIDDEN
    
    user = await find_user(data.send_to)
    message = {
        'msg': data.text
    }
    text = []
    text.append(message)
    await WriteMail(user.id, text)

    return schemas.Mail(
        user_id=str(user.id),
        text=text
    )

    




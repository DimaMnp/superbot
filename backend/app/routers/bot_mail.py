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
     # allow lookup by email as well as name
     input_str = data.strip()
     # if it looks like an email address, try email first
     if "@" in input_str and " " not in input_str:
         user = await User.find_one(User.email == input_str)
         if user:
             return user
         # fall through to name parsing if no one by that email

     data_words = input_str.split()
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
    # log for debug: which user is requesting mail
    try:
        print(f"Fetching mail for user {get_current_user.email} id={get_current_user.id}")
    except Exception:
        pass
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
    # only teachers and parents may compose messages
    if get_current_user.role not in (Role.teacher, Role.parent):
        raise Error.FORBIDDEN

    # look up recipient strictly by email
    recipient = await User.find_one(User.email == data.send_to)
    if not recipient:
        raise Error.USER_NOT_FOUND

    # construct the mail entry with metadata in case we need it later
    message = {
        'msg': data.text,
        'from': get_current_user.email,
        'to': recipient.email,
    }
    text = [message]

    # write to recipient mailbox
    await WriteMail(recipient.id, text)
    # also keep a copy for sender so they can verify what was sent
    await WriteMail(get_current_user.id, text)

    # log for debugging
    try:
        print(f"Mail sent from {get_current_user.email} to {recipient.email}, recipient_id={recipient.id}")
    except Exception:
        pass

    return schemas.Mail(
        user_id=str(recipient.id),
        text=text
    )

    




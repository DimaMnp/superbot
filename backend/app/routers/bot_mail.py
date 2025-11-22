from fastapi import APIRouter, Depends

from backend.app.data import schemas
from backend.app.data.models import Mail, User
from backend.app.utils.error import Error
from backend.app.utils.security import get_current_user

router = APIRouter(prefix="/mail")



@router.get("/mail/")
async def get_mail(get_current_user: User = Depends(get_current_user)) -> schemas.Mail:
    mail_history = await Mail.find_one(Mail.user_id == str(get_current_user.id))
    if not mail_history:
        raise Error.MAIL_NOT_FOUND
    
    return schemas.Mail(
        user_id=mail_history.user_id,
        text=mail_history.text
    )



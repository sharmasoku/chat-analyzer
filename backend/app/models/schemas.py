from pydantic import BaseModel

class ChatRequest(BaseModel):
    question: str
    selected_user: str = "Overall"

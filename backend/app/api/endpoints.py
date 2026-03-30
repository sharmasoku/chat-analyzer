import io
import uuid
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Response
from ..services import preprocessor, analyzer, pdf_gen, chatbot
from ..models.schemas import ChatRequest

router = APIRouter()

# In-memory storage for active sessions
SESSIONS = {}

@router.get("/")
def read_root():
    return {"status": "Backend is running"}

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")
    
    contents = await file.read()
    try:
        data = contents.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Error decoding file. Ensure it's exported securely.")

    df = preprocessor.preprocess(data)
    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded file is empty or formatted incorrectly.")

    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = df

    user_list = df['user'].unique().tolist()
    if 'Group Notification' in user_list:
        user_list.remove('Group Notification')
    user_list.sort()
    user_list.insert(0, 'Overall')

    return {
        "session_id": session_id,
        "users": user_list,
        "message": "File parsed successfully!"
    }

@router.get("/analysis/{session_id}")
def get_analysis(session_id: str, selected_user: str = 'Overall'):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session expired or not found. Please re-upload.")
    
    df = SESSIONS[session_id]
    
    num_msg, words, num_media, num_link, total_days_of_convo = analyzer.fetch_stats(selected_user, df)
    monthly_timeline = analyzer.monthly_analysis(selected_user, df)
    daily_timeline = analyzer.daily_analysis(selected_user, df)
    
    monthly_data = monthly_timeline[['time', 'message']].to_dict(orient='records')
    daily_timeline['only_date'] = daily_timeline['only_date'].astype(str)
    daily_data = daily_timeline[['only_date', 'message']].to_dict(orient='records')

    week_activity = analyzer.week_activity_chart(selected_user, df).reset_index()
    week_activity.columns = ['day', 'count']
    week_activity_data = week_activity.to_dict(orient='records')

    month_activity = analyzer.month_activity_chart(selected_user, df).reset_index()
    month_activity.columns = ['month', 'count']
    month_activity_data = month_activity.to_dict(orient='records')

    pivot_heatmap = analyzer.activity_heatmap(selected_user, df)
    heatmap_data = {
        "periods": pivot_heatmap.columns.tolist(),
        "days": pivot_heatmap.index.tolist(),
        "data": pivot_heatmap.values.tolist()
    }

    most_common_df = analyzer.most_common_word(selected_user, df)
    most_common_data = most_common_df.rename(columns={0: 'word', 1: 'count'}).to_dict(orient='records')

    emojis_df = analyzer.count_emojis(selected_user, df)
    emojis_data = []
    if not emojis_df.empty:
        emojis_data = emojis_df.rename(columns={0: 'emoji', 1: 'count'}).to_dict(orient='records')

    sentiment_data = analyzer.sentiment_analysis(selected_user, df)
    response_time_data = analyzer.response_time_analysis(selected_user, df)
    night_owl_data = analyzer.night_owl_early_bird(selected_user, df)
    avg_msg_len_data = analyzer.avg_message_length(selected_user, df)
    streak_data = analyzer.activity_streak(selected_user, df)

    response_data = {
        "top_stats": {
            "total_messages": num_msg,
            "total_words": words,
            "media_shared": num_media,
            "links_shared": num_link,
            "active_days": total_days_of_convo
        },
        "timeline": {
            "monthly": monthly_data,
            "daily": daily_data
        },
        "activity": {
            "weekly": week_activity_data,
            "monthly": month_activity_data,
            "heatmap": heatmap_data
        },
        "most_common_words": most_common_data,
        "emojis": emojis_data,
        "sentiment": sentiment_data,
        "response_time": response_time_data,
        "night_owl_early_bird": night_owl_data,
        "avg_message_length": avg_msg_len_data,
        "activity_streak": streak_data,
    }

    if selected_user == 'Overall':
        x, percent_df = analyzer.most_busy_user(df)
        busiest_bar = x.rename(columns={'user': 'user', 'percent': 'count'}).to_dict(orient='records')
        busiest_pie = percent_df.to_dict(orient='records')
        response_data['most_active_users'] = {
            "bar": busiest_bar,
            "pie": busiest_pie
        }

        first_msg = analyzer.first_message_user(df).reset_index()
        first_msg.columns = ['user', 'count']
        response_data['first_message'] = first_msg.to_dict(orient='records')

    return response_data

@router.get("/wordcloud/{session_id}")
def get_wordcloud(session_id: str, selected_user: str = 'Overall'):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session expired")
    
    df = SESSIONS[session_id]
    wordcloud_obj = analyzer.create_wordcloud(selected_user, df)
    img = wordcloud_obj.to_image()
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    mime_data = img_byte_arr.getvalue()
    
    return Response(content=mime_data, media_type="image/png")

@router.get("/export-pdf/{session_id}")
def export_pdf(session_id: str, selected_user: str = 'Overall'):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session expired or not found. Please re-upload.")
    
    df = SESSIONS[session_id]
    try:
        pdf_buffer = pdf_gen.generate_pdf(df, selected_user)
        filename = f"WhatsApp_Analysis_{selected_user.replace(' ', '_')}.pdf"
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@router.post("/chat/{session_id}")
def chat_with_data(session_id: str, request: ChatRequest):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session expired or not found.")

    df = SESSIONS[session_id]
    answer = chatbot.get_chat_response(df, request)
    return {"answer": answer}

import os
import emoji as emoji_lib
from collections import Counter
from google import genai
from . import analyzer

# Point to service account credentials
_current_dir = os.path.dirname(__file__)
_creds_path = os.path.join(_current_dir, '..', 'core', 'credentials.json')
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _creds_path

gemini_client = genai.Client(
    vertexai=True,
    project="whatsapp-chat-analyzer-491421",
    location="us-central1",
)

def _build_chat_context(df, selected_user: str = "Overall") -> str:
    """Build a detailed statistical summary of the chat data for AI context."""
    work_df = df.copy()
    if selected_user != "Overall":
        work_df = work_df[work_df["user"] == selected_user]

    # Basic stats
    num_msg = work_df.shape[0]
    num_words = int(work_df["num_words"].sum())
    num_media = work_df[work_df["message"] == "<Media omitted>"].shape[0]
    active_days = work_df["only_date"].nunique()
    avg_words = round(num_words / max(num_msg, 1), 1)

    # User list
    all_users = [u for u in df["user"].unique() if u != "Group Notification"]

    # Most active users
    user_msg_counts = df[df["user"] != "Group Notification"].groupby("user")["message"].count().sort_values(ascending=False)
    top_users = user_msg_counts.head(5).to_dict()

    # Date range
    date_min = str(work_df["date"].min())[:10] if len(work_df) > 0 else "N/A"
    date_max = str(work_df["date"].max())[:10] if len(work_df) > 0 else "N/A"

    # Busiest day of week
    busiest_day = work_df["day_name"].value_counts().head(3).to_dict() if len(work_df) > 0 else {}

    # Busiest hour
    busiest_hour = work_df["hour"].value_counts().head(3).to_dict() if len(work_df) > 0 else {}

    # Most common words
    temp = work_df[(work_df["user"] != "Group Notification") & (work_df["message"] != "<Media omitted>")]
    words = temp["message"].str.lower().str.split().explode()
    if len(analyzer.STOPWORDS) > 0:
        words = words[~words.isin(analyzer.STOPWORDS)]
    common_words = words.value_counts().head(15).to_dict() if len(words) > 0 else {}

    # Emoji stats
    all_text = " ".join(work_df["message"].dropna().astype(str))
    emojis = [c for c in all_text if c in emoji_lib.EMOJI_DATA]
    top_emojis = dict(Counter(emojis).most_common(10))

    # Monthly activity summary
    monthly = work_df.groupby(["year", "month"])["message"].count().reset_index()
    monthly["label"] = monthly["month"] + " " + monthly["year"].astype(str)
    monthly_summary = dict(zip(monthly["label"], monthly["message"]))

    # Response time (if available)
    valid_response = work_df[(work_df["total_hours"] > 0) & (work_df["total_hours"] < 8)]
    avg_response_mins = round(valid_response["total_hours"].mean() * 60, 1) if len(valid_response) > 0 else "N/A"

    # ── Message samples for sentiment analysis ──
    msg_df = work_df[
        (work_df["user"] != "Group Notification")
        & (work_df["message"] != "<Media omitted>")
        & (work_df["message"].str.strip().str.len() > 2)
    ][["user", "message", "date"]].copy()

    # Take up to 150 recent messages as a representative sample
    sample_size = min(150, len(msg_df))
    if sample_size > 0:
        msg_sample = msg_df.tail(sample_size)
        message_lines = []
        for _, row in msg_sample.iterrows():
            date_str = str(row["date"])[:16]
            message_lines.append(f"  [{date_str}] {row['user']}: {row['message']}")
        message_sample_text = chr(10).join(message_lines)
    else:
        message_sample_text = "  (No text messages available)"

    context = f"""
=== WHATSAPP CHAT ANALYSIS DATA ===
Currently viewing: {"All users (Overall)" if selected_user == "Overall" else f"User: {selected_user}"}
Date Range: {date_min} to {date_max}

STATISTICS:
- Total Messages: {num_msg}
- Total Words: {num_words}
- Average Words per Message: {avg_words}
- Media Shared: {num_media}
- Active Days: {active_days}
- Average Response Time: {avg_response_mins} minutes

ALL USERS IN CHAT: {', '.join(all_users)}

TOP ACTIVE USERS (by message count):
{chr(10).join(f'  - {u}: {c} messages' for u, c in top_users.items())}

BUSIEST DAYS OF WEEK:
{chr(10).join(f'  - {d}: {c} messages' for d, c in busiest_day.items())}

BUSIEST HOURS (24h format):
{chr(10).join(f'  - {h}:00 → {c} messages' for h, c in busiest_hour.items())}

MONTHLY MESSAGE COUNTS:
{chr(10).join(f'  - {m}: {c} messages' for m, c in monthly_summary.items())}

TOP 15 MOST COMMON WORDS:
{chr(10).join(f'  - "{w}": {c} times' for w, c in common_words.items())}

TOP EMOJIS USED:
{chr(10).join(f'  - {e}: {c} times' for e, c in top_emojis.items())}

CONVERSATION MESSAGES (for sentiment/tone analysis):
{message_sample_text}
"""
    return context.strip()

SYSTEM_PROMPT = """You are an intelligent WhatsApp Chat Analyst assistant embedded in a dashboard application. 
Your role is to answer questions about the uploaded WhatsApp chat data using the statistical context and conversation messages provided.

Rules:
1. Base ALL answers strictly on the data context provided. Never invent data.
2. Be conversational, friendly, and insightful.
3. Use emojis sparingly to make responses engaging.
4. When asked about trends, compare monthly/weekly data points.
5. If the data doesn't contain enough information to answer, say so honestly.
6. Keep responses concise (2-4 sentences usually), but go deeper if the user asks for detail.
7. You can do calculations from the provided numbers (averages, percentages, comparisons).
8. If the user asks a general question unrelated to the chat data, politely redirect them.
9. Format numbers nicely (e.g., "1,234" not "1234").
10. Use short paragraphs and line breaks for readability.
11. NEVER mention "sample messages", "sampling", or "based on the sample". Always present your analysis as based on the full conversation data.

SENTIMENT ANALYSIS:
When the user asks about sentiment, mood, tone, or feelings in the chat, you MUST analyze the conversation messages provided and classify the overall sentiment using one or more of these categories:
  Positive, Negative, Neutral, Mixed, Happy, Sad, Angry, Fearful, Surprised, Disgusted,
  Confident, Optimistic, Pessimistic, Frustrated, Excited, Calm, Anxious, Bored, Confused, Skeptical

For sentiment questions:
- Identify the PRIMARY sentiment (the dominant one) and any SECONDARY sentiments.
- Provide a percentage breakdown if possible (e.g., "60% Happy, 20% Excited, 15% Calm, 5% Frustrated").
- Quote specific messages as evidence for your classification.
- Analyze sentiment per-user if asked, or overall if not specified.
- Consider emojis, punctuation (!! or ???), capitalization, and word choice as sentiment indicators.
- IMPORTANT: Never say "based on the sample" or "from the sample messages". Say "based on the conversation" or "analyzing the chat messages" instead.
"""

def get_chat_response(df, request):
    """Generate a response from Gemini based on chat data."""
    context = _build_chat_context(df, request.selected_user)
    user_prompt = f"{context}\n\n---\nUSER QUESTION: {request.question}\n"

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_prompt,
            config={
                "system_instruction": SYSTEM_PROMPT,
                "temperature": 0.7,
                "max_output_tokens": 2048,
                "safety_settings": [
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                ]
            }
        )
        
        finish_reason = response.candidates[0].finish_reason
        answer = response.text

        if finish_reason != "STOP":
            answer += f"\n\n⚠️ (Note: The response was partially truncated due to {finish_reason.lower()} filtered settings.)"
    except Exception as e:
        answer = f"Sorry, I couldn't process that right now. Error: {str(e)}"

    return answer

from urlextract import URLExtract
from wordcloud import WordCloud
from collections import Counter
import pandas as pd
import numpy as np
import emoji
import re

# VADER Sentiment Analyzer (initialized once at module level)
from nltk.sentiment.vader import SentimentIntensityAnalyzer
_sia = SentimentIntensityAnalyzer()

extractor = URLExtract()

import os

# Load stopwords logically and efficiently at the module level
try:
    _current_dir = os.path.dirname(__file__)
    _stopword_path = os.path.join(_current_dir, '..', 'core', 'stop_hinglish.txt')
    with open(_stopword_path, 'r', encoding='utf-8') as file:
        STOPWORDS = set(file.read().split())
except Exception:
    STOPWORDS = set()

# ─── Sentiment keyword dictionaries for 20-category classification ───
_SENTIMENT_KEYWORDS = {
    'Happy':      {'happy', 'glad', 'joy', 'joyful', 'cheerful', 'delighted', 'pleased', 'yay', 'haha', 'lol', 'lmao', 'rofl', '😂', '😄', '😊', '🥳', '😁', 'hehe', 'hihi'},
    'Sad':        {'sad', 'unhappy', 'depressed', 'miserable', 'heartbroken', 'cry', 'crying', 'tears', 'miss', 'missing', '😢', '😭', '💔', 'sigh'},
    'Angry':      {'angry', 'furious', 'mad', 'rage', 'hate', 'pissed', 'annoyed', 'irritated', 'damn', 'hell', '😡', '🤬', '😤'},
    'Fearful':    {'scared', 'afraid', 'fear', 'terrified', 'anxious', 'worried', 'panic', 'creepy', 'horror', '😨', '😱', '😰'},
    'Surprised':  {'surprised', 'shocked', 'wow', 'omg', 'whoa', 'unexpected', 'unbelievable', 'no way', '😲', '😮', '🤯', 'wtf'},
    'Disgusted':  {'disgusted', 'gross', 'eww', 'yuck', 'nasty', 'horrible', 'awful', '🤢', '🤮'},
    'Confident':  {'confident', 'sure', 'certain', 'definitely', 'absolutely', 'obviously', 'clearly', 'easy', '💪', '🔥'},
    'Optimistic': {'hope', 'hoping', 'optimistic', 'looking forward', 'excited', 'can\'t wait', 'soon', 'positive', 'bright', '🤞', '✨'},
    'Pessimistic': {'hopeless', 'never', 'pointless', 'useless', 'impossible', 'doomed', 'worst', 'no point', 'give up'},
    'Frustrated': {'frustrated', 'ugh', 'argh', 'stuck', 'annoying', 'fed up', 'tired of', 'sick of', 'ffs', '😩', '😫'},
    'Excited':    {'excited', 'thrilled', 'pumped', 'awesome', 'amazing', 'fantastic', 'incredible', 'woohoo', 'yesss', 'lets go', '🎉', '🤩', '🥳', '🔥'},
    'Calm':       {'calm', 'peaceful', 'relaxed', 'chill', 'cool', 'okay', 'fine', 'alright', 'no worries', '😌', '🧘'},
    'Anxious':    {'anxious', 'nervous', 'worried', 'tense', 'uneasy', 'restless', 'stressed', 'overthinking', '😟', '😥'},
    'Bored':      {'bored', 'boring', 'dull', 'meh', 'whatever', 'nothing to do', 'so bored', '😐', '🥱'},
    'Confused':   {'confused', 'what', 'huh', 'idk', 'don\'t understand', 'makes no sense', 'weird', 'strange', '🤔', '😕', '❓'},
    'Skeptical':  {'skeptical', 'doubt', 'doubtful', 'really', 'sure about that', 'hmm', 'suspicious', 'idk', '🤨', '🧐'},
}


def fetch_stats(selected_user, df):
    if selected_user != 'Overall':
        df = df[df['user'] == selected_user]

    num_msg = df.shape[0]

    # Vectorized fast words calculation:
    num_words = df['num_words'].sum()

    # Fast media calculation
    num_media = df[df['message'] == '<Media omitted>'].shape[0]

    # Extract all links (Vectorized with list mapping instead of nested loop)
    def count_urls(msg):
        return len(extractor.find_urls(str(msg)))
        
    num_link = df['message'].apply(count_urls).sum()

    return num_msg, int(num_words), num_media, int(num_link), df['only_date'].nunique()


def most_busy_user(df):
    temp_df = df[df['user'] != 'Group Notification']
    
    # Group and aggregate words faster and cleanly
    total_words = temp_df['num_words'].sum()
    
    user_words = temp_df.groupby('user')['num_words'].sum()
    
    x = user_words.rename('percent').reset_index().sort_values('percent', ascending=False).head(5)
    percent_df = round((user_words / total_words) * 100, 2).rename('percent').reset_index()

    return x, percent_df


def create_wordcloud(selected_user, df):
    if selected_user != 'Overall':
        df = df[df['user'] == selected_user]

    temp_df = df[(df['user'] != 'Group Notification') & (df['message'] != '<Media omitted>')]

    # Fast Vectorized Stopword Removal using explode()
    words = temp_df['message'].str.lower().str.split().explode()
    filtered_words = words[~words.isin(STOPWORDS)]
    final_string = " ".join(filtered_words.dropna().astype(str))

    # Initialize Wordcloud
    wc = WordCloud(height=500, width=500, min_font_size=10, background_color='white')

    # If no words exist after filtering, handle gracefully
    if not final_string.strip():
        final_string = "No_Words"

    df_wc = wc.generate(final_string)
    return df_wc


def most_common_word(selected_user, df):
    if selected_user != 'Overall':
        df = df[df['user'] == selected_user]

    temp_df = df[(df['user'] != 'Group Notification') & (df['message'] != '<Media omitted>')]

    # Vectorized fast processing for extremely fast splits and counts
    words = temp_df['message'].str.lower().str.split().explode()
    filtered_words = words[~words.isin(STOPWORDS)].dropna()

    most_common = filtered_words.value_counts().head(20).reset_index()
    most_common.columns = [0, 1]  # Expects standard column layout from original

    return most_common


def count_emojis(selected_user, df):
    if selected_user != 'Overall':
        df = df[df['user'] == selected_user]

    # Combine text and extract emojis in ultra-fast one-liner list comprehension
    all_text = " ".join(df['message'].dropna().astype(str))
    emojis = [c for c in all_text if c in emoji.EMOJI_DATA]

    emojis_count = pd.DataFrame(Counter(emojis).most_common(20))
    if len(emojis_count) > 0:
        emojis_count.columns = [0, 1]
        
    return emojis_count


def monthly_analysis(selected_user, df):
    if selected_user != 'Overall':
        df = df[df['user'] == selected_user]

    # Optimize groupby mapping
    monthly_timeline = df.groupby(['year', 'month_num', 'month'])['message'].count().reset_index()
    monthly_timeline['time'] = monthly_timeline['month'] + "-" + monthly_timeline['year'].astype(str)
    return monthly_timeline


def daily_analysis(selected_user, df):
    if selected_user != 'Overall':
        df = df[df['user'] == selected_user]

    daily_timeline = df.groupby('only_date')['message'].count().reset_index()
    return daily_timeline


def week_activity_chart(selected_user, df):
    if selected_user != 'Overall':
        df = df[df['user'] == selected_user]

    return df['day_name'].value_counts()


def month_activity_chart(selected_user, df):
    if selected_user != 'Overall':
        df = df[df['user'] == selected_user]

    return df['month'].value_counts()


def activity_heatmap(selected_user, df):
    if selected_user != 'Overall':
        df = df[df['user'] == selected_user]

    pivot_activity_heatmap = df.pivot_table(index='day_name', columns='period', values='message', aggfunc='count').fillna(0)
    return pivot_activity_heatmap


def first_message_user(df):
    hour_gap = 5.00
    temp_df = df[df['user'] != 'Group Notification'].copy() # Use .copy() to remove SettingWithCopy warnings
    
    if len(temp_df) > 1:
        temp_df.loc[temp_df.index[1], 'total_hours'] = 10
        
    filtered = temp_df[temp_df['total_hours'] >= hour_gap]
    counts = filtered['user'].value_counts()
    
    if temp_df['user'].nunique() == 2:
        return counts
    else:
        return counts.head(5) if len(counts) >= 5 else counts.head(3)


# ════════════════════════════════════════════════════════════════════
#  NEW FEATURE FUNCTIONS
# ════════════════════════════════════════════════════════════════════

def _classify_sentiment(message: str) -> dict:
    """Classify a single message into VADER polarity + keyword-based emotion categories."""
    scores = _sia.polarity_scores(str(message))
    msg_lower = str(message).lower()

    # Base polarity
    compound = scores['compound']
    if compound >= 0.05:
        base = 'Positive'
    elif compound <= -0.05:
        base = 'Negative'
    else:
        base = 'Neutral'

    # Detect keyword-based emotions
    detected = set()
    for category, keywords in _SENTIMENT_KEYWORDS.items():
        for kw in keywords:
            if kw in msg_lower:
                detected.add(category)
                break

    # If both positive and negative signals exist → Mixed
    has_pos = any(c in detected for c in ('Happy', 'Excited', 'Optimistic', 'Confident', 'Calm'))
    has_neg = any(c in detected for c in ('Sad', 'Angry', 'Fearful', 'Frustrated', 'Anxious', 'Disgusted', 'Pessimistic'))
    if has_pos and has_neg:
        detected.add('Mixed')

    # If no keyword emotion detected, fall back to base polarity
    if not detected:
        detected.add(base)

    return {
        'compound': compound,
        'base': base,
        'emotions': detected,
    }


def sentiment_analysis(selected_user, df):
    """Perform sentiment analysis on messages, returning breakdown + monthly trend."""
    work_df = df.copy()
    if selected_user != 'Overall':
        work_df = work_df[work_df['user'] == selected_user]

    # Filter to actual text messages only
    text_df = work_df[
        (work_df['user'] != 'Group Notification') &
        (work_df['message'] != '<Media omitted>') &
        (work_df['message'].str.strip().str.len() > 1)
    ].copy()

    if text_df.empty:
        return {
            'breakdown': [],
            'monthly_trend': [],
            'overall_score': 0,
            'primary_sentiment': 'Neutral',
        }

    # Classify each message
    classifications = text_df['message'].apply(_classify_sentiment)
    text_df['compound'] = classifications.apply(lambda x: x['compound'])
    text_df['base'] = classifications.apply(lambda x: x['base'])
    text_df['emotions'] = classifications.apply(lambda x: x['emotions'])

    # ── Sentiment breakdown (all 20 categories + Positive/Negative/Neutral/Mixed) ──
    all_categories = ['Positive', 'Negative', 'Neutral', 'Mixed',
                      'Happy', 'Sad', 'Angry', 'Fearful', 'Surprised', 'Disgusted',
                      'Confident', 'Optimistic', 'Pessimistic', 'Frustrated', 'Excited',
                      'Calm', 'Anxious', 'Bored', 'Confused', 'Skeptical']

    total = len(text_df)
    counts = {}
    for cat in all_categories:
        counts[cat] = int(text_df['emotions'].apply(lambda ems: cat in ems).sum())

    # Only include categories with > 0 count, sorted descending
    breakdown = [
        {'sentiment': cat, 'count': counts[cat], 'percent': round(counts[cat] / total * 100, 1)}
        for cat in all_categories if counts[cat] > 0
    ]
    breakdown.sort(key=lambda x: x['count'], reverse=True)

    # ── Monthly sentiment trend ──
    text_df['year_month'] = text_df['date'].dt.to_period('M').astype(str)
    monthly = text_df.groupby('year_month').agg(
        avg_score=('compound', 'mean'),
        positive=('base', lambda x: (x == 'Positive').sum()),
        negative=('base', lambda x: (x == 'Negative').sum()),
        neutral=('base', lambda x: (x == 'Neutral').sum()),
        total=('base', 'count'),
    ).reset_index()

    monthly_trend = []
    for _, row in monthly.iterrows():
        monthly_trend.append({
            'month': row['year_month'],
            'avg_score': round(float(row['avg_score']), 3),
            'positive': int(row['positive']),
            'negative': int(row['negative']),
            'neutral': int(row['neutral']),
        })

    # Overall score
    overall_score = round(float(text_df['compound'].mean()), 3)
    primary_sentiment = breakdown[0]['sentiment'] if breakdown else 'Neutral'

    return {
        'breakdown': breakdown,
        'monthly_trend': monthly_trend,
        'overall_score': overall_score,
        'primary_sentiment': primary_sentiment,
    }


def response_time_analysis(selected_user, df):
    """Calculate average response time per user (in minutes). Excludes gaps > 8hrs."""
    work_df = df[df['user'] != 'Group Notification'].copy()

    # Filter to reasonable response times (> 0 and < 8 hours)
    valid = work_df[(work_df['total_hours'] > 0) & (work_df['total_hours'] < 8)].copy()

    if valid.empty:
        return {'per_user': [], 'overall_avg_minutes': 0, 'fastest_user': 'N/A', 'slowest_user': 'N/A'}

    # Per-user average
    user_avg = valid.groupby('user')['total_hours'].mean().sort_values()
    per_user = [
        {'user': user, 'avg_minutes': round(float(hours * 60), 1)}
        for user, hours in user_avg.items()
    ]

    if selected_user != 'Overall':
        per_user = [u for u in per_user if u['user'] == selected_user]

    overall_avg = round(float(valid['total_hours'].mean() * 60), 1)
    fastest = user_avg.index[0] if len(user_avg) > 0 else 'N/A'
    slowest = user_avg.index[-1] if len(user_avg) > 0 else 'N/A'

    return {
        'per_user': per_user,
        'overall_avg_minutes': overall_avg,
        'fastest_user': fastest,
        'slowest_user': slowest,
    }


def night_owl_early_bird(selected_user, df):
    """Classify messages by time-of-day category per user."""
    work_df = df[df['user'] != 'Group Notification'].copy()
    if selected_user != 'Overall':
        work_df = work_df[work_df['user'] == selected_user]

    if work_df.empty:
        return {'per_user': [], 'classification': {}}

    # Categorize hours
    def categorize_hour(h):
        if 6 <= h < 12:
            return 'Morning'
        elif 12 <= h < 18:
            return 'Afternoon'
        elif 18 <= h < 22:
            return 'Evening'
        else:
            return 'Night'

    work_df['time_category'] = work_df['hour'].apply(categorize_hour)

    # Per-user breakdown
    pivot = work_df.groupby(['user', 'time_category'])['message'].count().unstack(fill_value=0)
    for col in ['Morning', 'Afternoon', 'Evening', 'Night']:
        if col not in pivot.columns:
            pivot[col] = 0
    pivot = pivot[['Morning', 'Afternoon', 'Evening', 'Night']]

    per_user = []
    classification = {}
    for user in pivot.index:
        row = pivot.loc[user]
        total = row.sum()
        per_user.append({
            'user': user,
            'Morning': int(row['Morning']),
            'Afternoon': int(row['Afternoon']),
            'Evening': int(row['Evening']),
            'Night': int(row['Night']),
        })
        # Classify: if Night+Evening > Morning+Afternoon → Night Owl, else Early Bird
        night_score = row['Night'] + row['Evening']
        day_score = row['Morning'] + row['Afternoon']
        classification[user] = '🌙 Night Owl' if night_score > day_score else '🌅 Early Bird'

    return {
        'per_user': per_user,
        'classification': classification,
    }


def avg_message_length(selected_user, df):
    """Calculate average message length (words) per user."""
    work_df = df[
        (df['user'] != 'Group Notification') &
        (df['message'] != '<Media omitted>')
    ].copy()
    if selected_user != 'Overall':
        work_df = work_df[work_df['user'] == selected_user]

    if work_df.empty:
        return []

    user_avg = work_df.groupby('user')['num_words'].mean().sort_values(ascending=False)
    return [
        {'user': user, 'avg_words': round(float(avg), 1)}
        for user, avg in user_avg.items()
    ]


def activity_streak(selected_user, df):
    """Find the longest consecutive day streak of chat activity."""
    work_df = df.copy()
    if selected_user != 'Overall':
        work_df = work_df[work_df['user'] == selected_user]

    work_df = work_df[work_df['user'] != 'Group Notification']

    if work_df.empty:
        return {'longest_streak': 0, 'current_streak': 0, 'total_active_days': 0}

    # Get unique active dates sorted
    active_dates = sorted(work_df['only_date'].unique())
    total_active = len(active_dates)

    if total_active == 0:
        return {'longest_streak': 0, 'current_streak': 0, 'total_active_days': 0}

    # Convert to pandas Timestamps for date arithmetic
    dates = pd.to_datetime(active_dates)

    # Calculate consecutive streaks
    longest = 1
    current = 1

    for i in range(1, len(dates)):
        if (dates[i] - dates[i - 1]).days == 1:
            current += 1
            longest = max(longest, current)
        else:
            current = 1

    # Current streak (from most recent date backwards)
    current_streak = 1
    for i in range(len(dates) - 1, 0, -1):
        if (dates[i] - dates[i - 1]).days == 1:
            current_streak += 1
        else:
            break

    return {
        'longest_streak': int(longest),
        'current_streak': int(current_streak),
        'total_active_days': int(total_active),
    }

import pandas as pd
import re
import numpy as np

def preprocess(data):
    # Standardize the date parsing formats to remove narrow non-breaking spaces
    data = data.replace('\u202f', ' ')
    
    pattern = r'\d{1,2}/\d{1,2}/\d{2,4},\s\d{1,2}:\d{2}\s*[aApP][mM]'
    
    # Extract messages and times
    message = re.split(pattern, data)[1:]
    time = re.findall(pattern, data)

    # In case there are trailing/leading differences, strip and upper the times
    time = [t.upper() for t in time]
    
    if len(message) != len(time):
        # Fallback if there's any mismatch (though rare if regex perfectly splits)
        pass

    df = pd.DataFrame({'date': time, 'message': message})

    # Optimized Vectorized Date Parsing
    def parse_date(date_series):
        # First common format
        df_date = pd.to_datetime(date_series, format='%d/%m/%y, %I:%M %p', errors='coerce')
        # Second common format
        missing = df_date.isna()
        if missing.any():
            df_date.loc[missing] = pd.to_datetime(date_series[missing], format='%m/%d/%y, %I:%M %p', errors='coerce')
        # Final fallback
        missing = df_date.isna()
        if missing.any():
            df_date.loc[missing] = pd.to_datetime(date_series[missing], errors='coerce', dayfirst=True)
        return df_date

    df['date'] = parse_date(df['date'])

    # Vectorized word count
    df['num_words'] = df['message'].str.split().str.len()

    # Optimized Date/Time Feature Extraction
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month_name()
    df['day'] = df['date'].dt.day
    df['time'] = df['date'].dt.strftime('%H:%M')
    df['hour'] = df['date'].dt.hour
    df['minute'] = df['date'].dt.minute  # Fixed bug where minute was extracting day
    df['month_num'] = df['date'].dt.month
    df['only_date'] = df['date'].dt.date
    df['day_name'] = df['date'].dt.day_name()

    # Vectorized Period Generation (12-hour format)
    def to_12h(h):
        return np.where(h == 0, '12 AM',
                 np.where(h < 12, h.astype(str) + ' AM',
                   np.where(h == 12, '12 PM',
                     (h - 12).astype(str) + ' PM')))
    
    start_str = to_12h(df['hour'])
    end_str = to_12h((df['hour'] + 1) % 24)
    
    df['period'] = start_str + ' - ' + end_str

    # Optimized Vectorized User/Message Extraction
    # The original loop used: re.split('([\w\W]+?):\s', i) 
    # This splits into ['', 'User', 'Message content...']
    extracted = df['message'].str.extract(r'^([\w\W]+?):\s(.*)', expand=True)
    
    # Unmatched rows are Group Notifications
    df['user'] = extracted[0].fillna('Group Notification').str.replace('-', '', regex=False)
    df['message'] = extracted[1].fillna(df['message']).str.replace('\n', '', regex=False)

    # Filter out nulls
    df = df[df['message'] != 'null']

    # Vectorized Time Difference Calculation
    df['time_diff'] = df['date'].diff()
    df['total_hours'] = df['time_diff'].dt.total_seconds() / 3600
    
    if len(df) > 0:
        df.loc[df.index[0], 'total_hours'] = 100.00
    df['total_hours'] = df['total_hours'].round(2)

    return df

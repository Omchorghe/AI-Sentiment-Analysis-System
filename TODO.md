# Dataset Analysis API Fix — TODO

## Steps

1. [x] Rewrite `backend/routes/dataset_analysis.py`:
   - [x] Add imports: `TextBlob`, `json`, `logging`
   - [x] Set up logger
   - [x] Update `SUPPORTED_FORMATS` and validation logic
   - [x] Implement safe CSV/TXT reading with encoding fallback (`latin-1`) and `file.file.seek(0)`
   - [x] Implement safe text-column detection: `"review"` → `"text"` → first column
   - [x] Clean dataset: drop nulls, convert to string, strip, remove empty rows
   - [x] Log `df.shape` and `df.columns`
   - [x] Add row limit (`df.head(1000)`)
   - [x] Implement safe `get_sentiment(text)` wrapper for TextBlob
   - [x] Apply sentiment scoring with label mapping (`positive`/`neutral`/`negative`)
   - [x] Build `processed_rows` ensuring JSON serializable native Python types
   - [x] Handle empty dataset case with 400 error
   - [x] Distinguish 400 (client) vs 500 (internal) errors in exception handling
   - [x] Return exact JSON: `{"total", "positive", "neutral", "negative", "data"}`

2. [x] Start backend server and test with:
   - `test_dataset.csv` ✅ 200 OK
   - `test_multicolumn.csv` ✅ 200 OK
   - `test_reviews.txt` ✅ 200 OK

3. [x] Verify no HTTP 500 and correct JSON response.
   - Error handling verified: 400 for bad format, 400 for empty file



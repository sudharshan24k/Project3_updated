# Project3_updated: Angular + FastAPI Fullstack App

## Backend (FastAPI)

1. **Setup Python environment**
   ```sh
   cd backend
   python -m venv venv
   # For macOS/Linux:
   source venv/bin/activate
   # For Windows:
   venv\Scripts\activate
   ```

2. **Install dependencies**
   ```sh
   pip install -r requirements.txt
   ```

3. **Run the FastAPI server**
   ```sh
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   # API docs: http://127.0.0.1:8000/docs
   ```

## Frontend (Angular)

1. **Install dependencies**
   ```sh
   npm install
   ```

2. **Run the Angular app**
   ```sh
   ng serve
   # App runs at: http://localhost:4200
   ```

## Notes
- Make sure the backend is running before using the frontend.
- All form submissions and actions are stored in the database (no local file storage).
- For development, use `--reload` for FastAPI and `ng serve` for Angular.
- See `.gitignore` for ignored files and folders.

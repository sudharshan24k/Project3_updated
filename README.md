
cd backend

python -m venv venv
source venv/bin/activate

w:  venv\Scripts\activate

pip install -r requirements.txt
http://127.0.0.1:8000

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup

cd backend

npm install

npm start

 frontend host: **http://localhost:4200**.

# Dynamic Form Builder

This is a full-stack web application that allows users to create, manage, and use dynamic forms, similar to Google Forms. It features a FastAPI backend with MongoDB for data storage and an Angular frontend for a rich user experience.

## Features

- **Dynamic Form Creation**: Visually build forms by adding and configuring different field types (text, number, checkbox, dropdown).
- **Template Management**: Save, edit, preview, and duplicate form templates.
- **Form Submission**: Users can fill out and submit forms created from templates.
- **Submission Viewing**: View all submissions for a specific form template.
- **Submission Comparison**: A diff tool to compare two different versions of a submission.
- **Modern UI**: A clean, responsive, and intuitive user interface built with Angular and enhanced with Material Design components.

## Architecture

The project is divided into two main parts:

-   **`backend/`**: A Python-based backend using the **FastAPI** framework.
-   **`src/`**: An Angular-based frontend.

### Backend

-   **Framework**: FastAPI
-   **Database**: MongoDB
-   **Key Libraries**:
    -   `motor`: Asynchronous Python driver for MongoDB.
    -   `pydantic`: For data validation and settings management.
    -   `deepdiff`: For comparing submission data.
    -   `uvicorn`: ASGI server for running the application.

### Frontend

-   **Framework**: Angular
-   **UI Components**: Angular Material
-   **Key Libraries**:
    -   `@angular/forms`: For building and managing forms.
    -   `@angular/common/http`: For making requests to the backend API.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js and npm](https://nodejs.org/en/) (v18 or later recommended)
-   [Python](https://www.python.org/downloads/) (v3.10 or later recommended)
-   [MongoDB](https://www.mongodb.com/try/download/community) (running on the default port `27017`)

## How to Run

Follow these steps to get the application running on your local machine.

### 1. Backend Setup

First, set up and run the FastAPI backend server.

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a Python virtual environment
python -m venv venv
source venv/bin/activate
# On Windows, use: venv\Scripts\activate

# 3. Install the required Python packages
pip install -r requirements.txt

# 4. Start the backend server
# The server will run on http://127.0.0.1:8000
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup

In a separate terminal, set up and run the Angular frontend.

```bash
# 1. Navigate to the project root directory (if you're in the backend folder, go back one level)
# cd ..

# 2. Install the required npm packages
npm install

# 3. Start the Angular development server
# The application will be available at http://localhost:4200
npm start
```

Once both the backend and frontend servers are running, you can access the application by opening your web browser and navigating to **http://localhost:4200**.

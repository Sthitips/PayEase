# PayEase 💸

PayEase is a web application built for the PayPal AI Hackathon, focused on simplifying everyday payments and expense management.

## 🚀 Features

- User-friendly React frontend
- FastAPI backend
- Axios for API communication
- TanStack Query for server-state management
- PayPal Sandbox integration for testing payment flows

## 🛠️ Tech Stack

**Frontend:** React, Vite, Tailwind CSS, Axios, TanStack Query  
**Backend:** Python, FastAPI  
**Payments:** PayPal Sandbox

## 📁 Project Structure

```text
PayPal AI Hackathon/
├── Backend/    # FastAPI backend
├── PayEase/    # React frontend
├── LICENSE
└── README.md
```

## ⚙️ Getting Started

### Prerequisites

- Node.js and npm
- Python 3.10+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Shtitips/PayEase.git
cd PayEase
```

### 2. Set up the frontend

```bash
cd PayEase
npm install
npm run dev
```

### 3. Set up the backend

Open a separate terminal from the repository root:

```bash
cd Backend
python -m venv .venv
```

Activate the virtual environment.

**Windows PowerShell:**
```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies and start the server:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The FastAPI interactive documentation is available at:

http://127.0.0.1:8000/docs

## 🔐 Environment Variables

Create the required `.env` files locally and configure your environment variables before running the application.

For PayPal integration, use your **Sandbox** credentials during development. Never commit API secrets or `.env` files to GitHub.

## 🧪 Testing

Use the PayPal Sandbox test accounts to test supported payment flows without using real money.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

# 💻 Collaborative CodeSpace — MERN + Redis

A **real-time collaborative coding platform** where developers can **code together, chat, and compile programs** live inside a shared session.  
Built with the **MERN stack** and **Redis**, it supports **admin-controlled editing**, **shared compiler output**, and **live chat**, all inside an interactive coding environment.  

---

## 🚀 Features

- 🧑‍💻 **Collaborative Code Editor** — Real-time code sharing and updates via Socket.IO  
- ⚙️ **Online Compiler** — Execute code directly from the browser (via Judge0 API or Docker sandbox)  
- 💬 **Live Chat** — Chat with collaborators during coding sessions  
- 🔐 **Admin / Ownership Control** — Only the admin (or transferred owner) can type or run code  
- 🔄 **Transfer Ownership** — Admin can give coding control to another participant  
- ⚡ **Redis-Powered Real-Time Sync** — Handles session data and socket communication efficiently  
- ☁️ **GitHub Codespaces-Ready** — No local setup needed — runs entirely in a Codespace  

---

## 🧰 Tech Stack

| Layer | Technology |
|--------|-------------|
| **Frontend** | React (Vite / CRA) + Tailwind CSS + Socket.IO client |
| **Backend** | Node.js + Express.js + Socket.IO |
| **Database** | MongoDB (Mongoose) |
| **Cache / Message Broker** | Redis |
| **Compiler Engine** | Judge0 API *(or Docker sandbox)* |
| **Auth / Roles** | JWT + bcrypt |
| **Development Environment** | GitHub Codespaces / VS Code |

---

## 📁 Project Structure

project/
├── app/ # Frontend (React)
│ ├── src/
│ ├── public/
│ ├── package.json
│ └── .env
├── server/ # Backend (Express + Socket.IO)
│ ├── src/
│ ├── routes/
│ ├── controllers/
│ ├── models/
│ ├── utils/
│ ├── package.json
│ └── .env
└── README.md

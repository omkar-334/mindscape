# Mindscape

## Overview

Mindscape is a web platform built using React and FastAPI, aiming to promote mental wellness through community engagement, personal tracking, and curated resources. It serves as a safe space where users can connect with peers, monitor their emotional health, and access professional support tools.

---
<img width="1440" alt="Screenshot 2024-11-16 at 1 38 50 AM" src="https://github.com/user-attachments/assets/eba020a8-d245-41ec-b073-c4ace0faa431">

## Features

### **Community Support**
Mindscape provides a peer-driven support system, enabling users to:
- Share experiences in a judgment-free environment.
- Join support groups tailored to specific mental health challenges such as anxiety or depression.
- Participate in discussions and receive encouragement from others.
<img width="1440" alt="Screenshot 2024-11-16 at 1 39 36 AM" src="https://github.com/user-attachments/assets/312775c2-3ef0-42d0-b9c8-56125a613004">

### **Mood Tracking**
Track emotional well-being with:
- An intuitive interface for logging moods daily.
- Calendar views for visualizing mood trends over time.
- Insights into patterns of emotions like joy, sadness, anger, and fear.
<img width="1440" alt="Screenshot 2024-11-16 at 1 39 54 AM" src="https://github.com/user-attachments/assets/9e52f526-442f-4d83-8a59-2241b9c7e7fa">
<img width="1440" alt="Screenshot 2024-11-16 at 1 40 18 AM" src="https://github.com/user-attachments/assets/79e847e6-9d4b-4f15-9d13-a2976deeba2e">


### **Sentiment Analysis**
- Analyze emotional trends using a sentiment analysis tool.
- View detailed emotion breakdowns for individual entries.
- Track metrics like dominant emotions, sentiment scores, and emotional averages over time.
<img width="1440" alt="Screenshot 2024-11-16 at 1 40 33 AM" src="https://github.com/user-attachments/assets/663559fa-2cd9-48cd-8ad6-f4fc743ce882">
<img width="1440" alt="Screenshot 2024-11-16 at 1 45 29 AM" src="https://github.com/user-attachments/assets/aa017375-2d14-4fac-8bcf-e5e4b0907000">

### **Self-Care Resources**
Mindscape offers a variety of self-care tools, including:
- Guided meditation exercises.
- Breathing techniques for stress relief.
- Sleep hygiene tips and stress management resources.
<img width="1440" alt="Screenshot 2024-11-16 at 1 39 06 AM" src="https://github.com/user-attachments/assets/1d377d93-d440-492f-a664-962efa597012">

### **Local Mental Health Resources**
Users can find nearby support, such as:
- Therapists, clinics, and holistic health centers with contact information and locations.
- Crisis support resources, including 24/7 hotlines and emergency contacts.

### **Support Bot (Powered by Groq LLM)**
Mindscape’s intelligent chatbot provides:
- Immediate assistance by answering questions or directing users to relevant resources.
- Support forums where users can discuss topics like mindfulness, anxiety, and recovery.
<img width="1032" alt="Screenshot 2024-11-16 at 1 40 58 AM" src="https://github.com/user-attachments/assets/842c712b-2272-423b-a384-5332b11abbf9">

---

## Technical Stack

### **Frontend**
- **React.js**: For creating a dynamic and responsive user interface.
- **Tailwind CSS**: To ensure a modern and accessible design system.

### **Backend**
- **FastAPI**: For building a high-performance, RESTful API backend.
- **Groq LLM**: Enhancing user interactions with natural language processing capabilities.

### **Database**
- Structured to store user profiles, mood entries, and community discussions efficiently.

---

## Installation and Setup

### Prerequisites
Ensure the following tools are installed:
- Node.js and npm
- Python 3.x and pip

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/omkar-334/mindscape.git
   cd mindscape
   ```

2. **Install dependencies**:
   - For the frontend:
     ```bash
     npm install
     ```
   - For the backend:
     ```bash
     pip install -r requirements.txt
     ```

3. **Run the backend server**:
   ```bash
   uvicorn main:app --reload
   ```

4. **Run the frontend server**:
   ```bash
   npm start
   ```

5. Open the app in your browser at `http://localhost:5173` (frontend) and `http://localhost:8000` (backend).

---

## Contribution

Mindscape is an open-source project. Contributions are welcome to enhance features or address issues. 

### How to Contribute
1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Make your changes and commit them:
   ```bash
   git commit -m "Description of changes"
   ```
4. Push the branch and submit a pull request.



**Mindscape: Your journey to better mental health begins here.**

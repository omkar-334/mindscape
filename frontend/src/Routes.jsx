import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Register';
import Home from './components/Home';
import ChatPage from './components/ChatPage';
import Forum from './components/Forum';
import PrivateRoute from './components/PrivateRoute';
import SocialAuth from './components/SocialAuth';
import Profile from './components/Profile';
import JournalEditor from './components/JournalEditor';
import Analysis from './components/Analysis';
import ChatBot from './components/Chatbot';
import MentalHealthQuestionnaire from './components/Question';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <ChatPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/connect-social"
        element={
          <PrivateRoute>
            <SocialAuth />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/journal"
        element={
          <PrivateRoute>
            <JournalEditor />
          </PrivateRoute>
        }
      />
      <Route
        path="/analysis"
        element={
          <PrivateRoute>
            <Analysis />
          </PrivateRoute>
        }
      />
      <Route
        path="/support"
        element={
          <PrivateRoute>
            <ChatBot />
          </PrivateRoute>
        }
      />
       <Route
        path="/question"
        element={
          <PrivateRoute>
            <MentalHealthQuestionnaire />
          </PrivateRoute>
        }
      />

<Route
  path="/chat/:id"
  element={
    <PrivateRoute>
      <ChatPage />
    </PrivateRoute>
  }
/>

      <Route
        path="/forum"
        element={
          <PrivateRoute>
            <Forum />
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;

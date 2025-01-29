import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { VideoProvider } from './contexts/VideoContext';
import { TherapistsProvider } from "./contexts/TherapistsContext";
import { Toaster } from 'react-hot-toast';
import NavBar from './components/NavBar';
import Routes from './Routes';
import ConsentPopup from './components/ConsentPopup';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VideoProvider>
          <TherapistsProvider>
          <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            <NavBar />
            <Routes />
            <ConsentPopup />
          </div>
          </TherapistsProvider>
        </VideoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
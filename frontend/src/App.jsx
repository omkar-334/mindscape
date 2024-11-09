import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import NavBar from './components/NavBar';
import Routes from './Routes';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          <NavBar />
          <Routes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
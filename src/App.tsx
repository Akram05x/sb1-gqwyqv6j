import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { ReportIssue } from './pages/ReportIssue';
import { ThankYou } from './pages/ThankYou';
import { Rewards } from './pages/Rewards';
import { Admin } from './pages/Admin';
import { CreateAdmin } from './pages/CreateAdmin';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  // Removed automatic Firestore initialization to prevent permission errors
  // Data seeding should be done in a controlled environment, not on every client load

  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/report" element={<ReportIssue />} />
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/create-admin" element={<CreateAdmin />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
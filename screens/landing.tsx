import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Cookies from 'js-cookie';
import GoogleSignInButton from '../components/GoogleSignInButton';
import UserProfile from '../components/UserProfile';
import './landing.css';
import '../components/userProfile.css'; // Import the new CSS file

const providers = [
  { name: 'Zoom', path: '/zoom', logo: '/assets/zoom.png', color: '#0B5CFF' },
  { name: 'Teams', path: '/teams', logo: '/assets/teams.png', color: '#5B5FC7' },
  { name: 'Google Meet', path: '/google', logo: '/assets/meet.png', color: '#1A73E8' },
];

// NOTE: Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export default function Landing() {
  const [gmail, setGmail] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);

  useEffect(() => {
    const storedGmail = Cookies.get('gmail');
    const storedProfilePic = Cookies.get('profile_pic');
    const accessToken = Cookies.get('google_access_token');
    if (storedGmail) {
      setGmail(storedGmail && accessToken);
      setIsGoogleAuthenticated(true);
    }
    if (storedProfilePic) {
      setProfilePic(storedProfilePic);
    }
    if (!accessToken) {
        setIsGoogleAuthenticated(false);
    }
  }, [gmail]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="landing-wrap">
        <div className="landing-header">
          <div className="top-right">
            {gmail ? (
              <UserProfile
                gmail={gmail}
                profilePic={profilePic}
                setGmail={setGmail}
                setProfilePic={setProfilePic}
              />
            ) : (
              <GoogleSignInButton
                setGmail={setGmail}
                setProfilePic={setProfilePic}
              />
            )}
          </div>
          <h1 className="landing-title">Choose a meeting platform</h1>
          <p className="landing-subtitle">Pick one to continue</p>
        </div>
        <div className="card-grid">
          {providers.map(p => {
            const isGoogleMeet = p.name === 'Google Meet';
            const isDisabled = isGoogleMeet && !isGoogleAuthenticated;

            // Common card content to avoid repetition
            const cardContent = (
              <div className="card-inner">
                <div className="logo-wrap" style={{ background: p.color + '10' }}>
                  <img src={p.logo} alt={p.name} className="logo" />
                </div>
                <div className="card-content">
                  <h2 className="card-title">{p.name}</h2>
                  <p className="card-desc">Open {p.name} version</p>
                </div>
              </div>
            );

            if (isDisabled) {
              return (
                <div
                  key={p.name}
                  className="card disabled" // Add disabled class
                  style={{ borderColor: p.color }}
                  title="Please sign in with Google to use Google Meet" // Tooltip for users
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link key={p.name} to={p.path} className="card" style={{ borderColor: p.color }}>
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
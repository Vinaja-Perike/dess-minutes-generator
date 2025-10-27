import React, { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import './userProfile.css';

const UserProfile = ({ gmail, profilePic, setGmail, setProfilePic }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);

  const handleSignOut = () => {
    Cookies.remove('google_access_token');
    Cookies.remove('gmail');
    Cookies.remove('profile_pic');
    setGmail(null);
    setProfilePic(null);
  };

  const getInitial = () => {
    return gmail ? gmail.charAt(0).toUpperCase() : '';
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="user-profile" ref={dropdownRef}>
      <div className="avatar-container" onClick={() => setDropdownVisible(!dropdownVisible)}>
        {profilePic ? (
          <img src={profilePic} alt="Profile" className="avatar-image" />
        ) : (
          <div className="col">
            <div className="avatar-initial">{getInitial()}</div>
            <div className="text-light">You are signed in as {gmail.email}</div>
          </div>
        )}
      </div>
      {dropdownVisible && (
        <div className="dropdown-menu">
          {/* <p className="user-email">{gmail}</p> */}
          <button onClick={handleSignOut} className="signout-button">Sign Out</button>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
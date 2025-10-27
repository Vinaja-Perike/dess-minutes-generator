import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import Cookies from 'js-cookie';

const GoogleSignInButton = ({ setGmail, setProfilePic }) => {
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const { access_token } = tokenResponse;
        Cookies.set('google_access_token', access_token, { expires: 7 });

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });

        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          setGmail(userInfo.email);
          setProfilePic(userInfo.picture); // Set the profile picture URL
          Cookies.set('gmail', userInfo.email, { expires: 7 });
          Cookies.set('profile_pic', userInfo.picture, { expires: 7 }); // Store profile picture URL in a cookie
        } else {
          throw new Error('Failed to fetch user info from Google.');
        }
      } catch (error) {
        console.error('Error during Google sign-in process:', error);
      }
    },
    scope: 'https://www.googleapis.com/auth/meetings.space.created https://www.googleapis.com/auth/meetings.space.readonly',
    onError: () => {
      console.error('Google Login Failed');
    },
  });

  return (
    <button onClick={() => login()} className="google-signin-button">
      Sign in with Google
    </button>
  );
};

export default GoogleSignInButton;
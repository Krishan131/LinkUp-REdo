import { useState, useEffect } from 'react';
import ProfileForm from './ProfileForm'; // <--- Import the new component
import ProfileView from './ProfileView'; // <--- Import the profile view component
import CreatePurposeForm from './PurposeForm';
import PurposeSwiper from './PurposeSwiper';
import MatchesDashboard from './MatchesDashboard.jsx'; // <--- Import the new component
import Inbox from './Inbox.jsx'; // <--- Import the new Inbox component
import MyInterests from './MyInterests.jsx'; // <--- Import the new MyInterests component
import Chat from './Chat.jsx'; // <--- Import the new Chat component
import './Login.css'; // <--- Import the login styles
import './MainApp.css'; // <--- Import the main app styles

// Register Component
function Register({ onLoginClick }) {
    // ... (This component remains the same)
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
  
    const handleRegister = async (e) => {
      e.preventDefault();
      setMessage('');
  
      try {
        const response = await fetch('http://localhost:5000/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });
  
        const data = await response.json();
        setMessage(data.message);
      } catch (error) {
        console.error('Registration failed:', error);
        setMessage('Registration failed. Please try again.');
      }
    };
  
    return (
      <div className="login-container">
        <div className="login-form">
          <h2 className="login-title">Register</h2>
          <form onSubmit={handleRegister}>
            <input
              className="login-input"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="login-button" type="submit">Sign Up</button>
          </form>
          {message && (
            <p className={`login-message ${message.includes('successful') ? 'success' : 'error'}`}>
              {message}
            </p>
          )}
          <p className="login-switch">
            Already have an account? <button onClick={onLoginClick}>Login</button>
          </p>
        </div>
      </div>
    );
}

// Login Component
function Login({ onRegisterClick, onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            setMessage(data.message);

            // If login is successful, call the success handler
            if (response.ok) {
                onLoginSuccess(data.user); // <--- We now pass the user object to the parent
            }
        } catch (error) {
            console.error('Login failed:', error);
            setMessage('Login failed. Please try again.');
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <h2 className="login-title">Login</h2>
                <form onSubmit={handleLogin}>
                    <input
                        className="login-input"
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        className="login-input"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button className="login-button" type="submit">Log In</button>
                </form>
                {message && (
                    <p className={`login-message ${message.includes('successful') ? 'success' : 'error'}`}>
                        {message}
                    </p>
                )}
                <p className="login-switch">
                    Don't have an account? <button onClick={onRegisterClick}>Register</button>
                </p>
            </div>
        </div>
    );
}

function App() {
    const [isRegister, setIsRegister] = useState(true);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [hasProfile, setHasProfile] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('swiper'); // <--- New state for the current view
    const [currentChat, setCurrentChat] = useState(null);
    const [ws, setWs] = useState(null);
    useEffect(() => {
        const checkUserProfile = async () => {
            if (loggedInUser) {
                setIsLoading(true);
                try {
                    const response = await fetch(`http://localhost:5000/api/profile/${loggedInUser.id}`);
                    if (response.ok) {
                        setHasProfile(true);
                    } else {
                        setHasProfile(false);
                    }
                } catch (error) {
                    console.error('Error checking profile:', error);
                    setHasProfile(false);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        checkUserProfile();
    }, [loggedInUser]);

    useEffect(() => {
        if (loggedInUser) {
            const websocket = new WebSocket('ws://localhost:5000');
            websocket.onopen = () => {
                websocket.send(JSON.stringify({ type: 'auth', userId: loggedInUser.id }));
            };
            websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'notification') {
                    alert(data.message);
                }
            };
            setWs(websocket);
            return () => websocket.close();
        }
    }, [loggedInUser]);

    const handleLoginSuccess = (user) => {
        setLoggedInUser(user);
        setIsRegister(false);
    };

    // Refresh user data (for when username is updated)
    const refreshUserData = async () => {
        if (loggedInUser) {
            try {
                const response = await fetch(`http://localhost:5000/api/profile/${loggedInUser.id}`);
                if (response.ok) {
                    const profileData = await response.json();
                    setLoggedInUser({ ...loggedInUser, username: profileData.username });
                }
            } catch (error) {
                console.error('Failed to refresh user data:', error);
            }
        }
    };

    // NEW: The handler now takes two full user objects
    const handleStartChat = (user1, user2) => {
        setCurrentChat({ user1, user2 });
        setView('chat');
    };

    const renderMainApp = () => {
        return (
            <div className="main-app-container">
                <div className="main-app-content">
                    <h2 className="main-app-header">Welcome, {loggedInUser.username}!</h2>
                    <div className="main-app-nav">
                        <button className={view === 'swiper' ? 'active' : ''} onClick={() => setView('swiper')}>Browse Purposes</button>
                        <button className={view === 'create' ? 'active' : ''} onClick={() => setView('create')}>Post a Purpose</button>
                        <button className={view === 'matches' ? 'active' : ''} onClick={() => setView('matches')}>My Matches</button>
                        <button className={view === 'interests' ? 'active' : ''} onClick={() => setView('interests')}>My Interests</button>
                        <button className={view === 'inbox' ? 'active' : ''} onClick={() => setView('inbox')}>Inbox</button>
                        <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}>My Profile</button>
                    </div>

                    <div className="main-app-view">
                        {view === 'swiper' && <PurposeSwiper userId={loggedInUser.id} />}
                        {view === 'create' && (
                            <CreatePurposeForm
                                userId={loggedInUser.id}
                                onPurposeCreated={() => setView('swiper')}
                            />
                        )}
                        {view === 'matches' && <MatchesDashboard userId={loggedInUser.id} onSelectChat={handleStartChat} />}
                        {view === 'interests' && <MyInterests userId={loggedInUser.id} onSelectChat={handleStartChat} />}
                        {view === 'inbox' && <Inbox userId={loggedInUser.id} onSelectChat={handleStartChat} />}
                        {view === 'profile' && <ProfileView userId={loggedInUser.id} onProfileUpdate={refreshUserData} />}
                        {view === 'chat' && currentChat && (
                            <Chat
                                senderId={loggedInUser.id}
                                receiverId={currentChat.user1.id === loggedInUser.id ? currentChat.user2.id : currentChat.user1.id}
                                onBack={() => setView(currentChat.user1.id === loggedInUser.id ? 'matches' : 'inbox')}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    };


    const renderAuthForms = () => {
        return isRegister ? (
            <Register onLoginClick={() => setIsRegister(false)} />
        ) : (
            <Login
                onRegisterClick={() => setIsRegister(true)}
                onLoginSuccess={handleLoginSuccess}
            />
        );
    };

    if (isLoading) {
        return <p>Loading...</p>;
    }

    if (loggedInUser) {
        if (hasProfile) {
            return renderMainApp();
        } else {
            return (
                <ProfileForm 
                    userId={loggedInUser.id} 
                    onProfileSaved={() => setHasProfile(true)}
                />
            );
        }
    }

    return renderAuthForms();
}

export default App;
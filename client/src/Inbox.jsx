import { useState, useEffect } from 'react';
import './Inbox.css';

function Inbox({ userId, onSelectChat }) {
    const [matches, setMatches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchMatches = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`http://localhost:5000/api/accepted-matches?userId=${userId}`);
                const data = await response.json();
                if (response.ok) {
                    setMatches(data);
                    if (data.length === 0) {
                        setMessage('No accepted matches yet.');
                    }
                } else {
                    setMessage(data.message || 'Failed to fetch matches.');
                }
            } catch (error) {
                console.error('Error fetching matches:', error);
                setMessage('Failed to fetch matches. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMatches();
    }, [userId]);

    return (
        <div>
            <h2>Inbox</h2>
            {isLoading && <p>Loading...</p>}
            {!isLoading && message && <p>{message}</p>}
            {!isLoading && matches.length > 0 && (
                <div className="inbox-container">
                    {matches.map((match) => (
                        <div key={match.purpose_id} className="inbox-card">
                            <img src={match.other_image ? `http://localhost:5000${match.other_image}` : 'https://via.placeholder.com/200'} alt={match.other_username} className="profile-image" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/200'; }} />
                            <strong>{match.other_username}</strong>
                            <p className="user-bio">{match.other_bio}</p>
                            <p>Purpose: {match.purpose_title}</p>
                            <button onClick={() => onSelectChat({ id: userId, username: 'you' }, { id: match.other_user_id, username: match.other_username })} className="open-chat-button">
                                Open Chat
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Inbox;

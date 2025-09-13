import { useState, useEffect } from 'react';

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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {matches.map((match) => (
                        <div key={match.purpose_id} style={{ border: '1px solid #ccc', padding: '10px', width: '200px' }}>
                            <img src={match.other_image || 'https://via.placeholder.com/100'} alt={match.other_username} style={{ width: '100%', height: 'auto', marginBottom: '10px' }} />
                            <strong>{match.other_username}</strong>
                            <p style={{ fontSize: '0.9em', color: '#555' }}>{match.other_bio}</p>
                            <p>Purpose: {match.purpose_title}</p>
                            <button onClick={() => onSelectChat({ id: userId, username: 'you' }, { id: match.other_user_id, username: match.other_username })}>
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

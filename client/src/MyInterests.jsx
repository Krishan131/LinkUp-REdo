import { useState, useEffect } from 'react';

function MyInterests({ userId }) {
    const [interests, setInterests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchInterests = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`http://localhost:5000/api/my-interests?userId=${userId}`);
                const data = await response.json();
                if (response.ok) {
                    setInterests(data);
                    if (data.length === 0) {
                        setMessage('No pending interests.');
                    }
                } else {
                    setMessage(data.message || 'Failed to fetch interests.');
                }
            } catch (error) {
                console.error('Error fetching interests:', error);
                setMessage('Failed to fetch interests. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchInterests();
    }, [userId]);

    const handleAcceptMatch = async (purposeId, posterId) => {
        try {
            const response = await fetch('http://localhost:5000/api/match/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ purposeId, interestedUserId: userId }),
            });
            if (response.ok) {
                // Remove from list
                setInterests(prev => prev.filter(i => !(i.purpose_id === purposeId && i.poster_id === posterId)));
            } else {
                alert('Failed to accept match.');
            }
        } catch (error) {
            console.error('Error accepting match:', error);
            alert('Failed to accept match. Please try again.');
        }
    };

    return (
        <div>
            <h2>My Interests</h2>
            {isLoading && <p>Loading...</p>}
            {!isLoading && message && <p>{message}</p>}
            {!isLoading && interests.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {interests.map((interest) => (
                        <div key={interest.purpose_id} style={{ border: '1px solid #ccc', padding: '10px', width: '200px' }}>
                            <img src={interest.poster_image || 'https://via.placeholder.com/100'} alt={interest.poster_username} style={{ width: '100%', height: 'auto', marginBottom: '10px' }} />
                            <strong>{interest.poster_username}</strong>
                            <p style={{ fontSize: '0.9em', color: '#555' }}>{interest.poster_bio}</p>
                            <p>Purpose: {interest.purpose_title}</p>
                            <button onClick={() => handleAcceptMatch(interest.purpose_id, interest.poster_id)}>
                                Accept Match
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyInterests;

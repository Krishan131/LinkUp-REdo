import { useState, useEffect } from 'react';
import './MatchesDashboard.css';

function MatchesDashboard({ userId, onSelectChat }) {
    const [matches, setMatches] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchMatches = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`https://linkup-redo-2.onrender.com/api/my-purposes/interests?userId=${userId}`);
                const data = await response.json();

                if (response.ok) {
                    if (data.length === 0) {
                        setMessage('You have no new interests on your purposes.');
                    } else {
                        const groupedMatches = data.reduce((acc, current) => {
                            if (!acc[current.purpose_id]) {
                                acc[current.purpose_id] = {
                                    title: current.purpose_title,
                                    description: current.purpose_description,
                                    interestedUsers: [],
                                };
                            }
                            acc[current.purpose_id].interestedUsers.push({
                                id: current.interested_user_id,
                                username: current.interested_username,
                                bio: current.interested_user_bio,
                                profile_image_url: current.interested_user_image,
                            });
                            return acc;
                        }, {});
                        setMatches(groupedMatches);
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

// NEW: Function to handle accepting an interested user
    const handleAcceptMatch = async (purposeId, interestedUserId) => {
        try {
            const response = await fetch('https://linkup-redo-2.onrender.com/api/purpose/accept-interest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    purposeId: purposeId,
                    posterId: userId,
                    interestedUserId: interestedUserId,
                }),
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                // Update the UI to remove the accepted user from the list
                setMatches(prevMatches => {
                    const newMatches = { ...prevMatches };
                    const interestedUsers = newMatches[purposeId].interestedUsers;
                    newMatches[purposeId].interestedUsers = interestedUsers.filter(
                        user => user.id !== interestedUserId
                    );
                    return newMatches;
                });
            }
        } catch (error) {
            console.error('Error accepting match:', error);
            alert('Failed to accept match. Please try again.');
        }
    };

     return (
        <div>
            <h2>My Matches</h2>
            {isLoading && <p>Loading...</p>}
            {!isLoading && message && <p>{message}</p>}
            {!isLoading && Object.keys(matches).length > 0 && (
                <div>
                    {Object.keys(matches).map((purposeId) => (
                        <div key={purposeId} className="purpose-card">
                            <h3>Purpose: {matches[purposeId].title}</h3>
                            <p>{matches[purposeId].description}</p>
                            <h4>Interested Users:</h4>
                            <div className="interested-users-container">
                                {matches[purposeId].interestedUsers.map((user) => (
                                    <div key={user.id} className="user-card">
                                        <img src={user.profile_image_url ? `https://linkup-redo-2.onrender.com${user.profile_image_url}` : 'https://via.placeholder.com/200'} alt={user.username} className="profile-image" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/200'; }} />
                                        <strong>{user.username}</strong>
                                        <p className="user-bio">{user.bio}</p>
                                        <button onClick={() => handleAcceptMatch(purposeId, user.id)} className="accept-match-button">
                                            Accept Match
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MatchesDashboard;
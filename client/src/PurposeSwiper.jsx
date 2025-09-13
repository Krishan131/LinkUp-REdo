import { useState, useEffect } from 'react';

function PurposeSwiper({ userId }) {
    const [purposes, setPurposes] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPurposes = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`http://localhost:5000/api/purposes?userId=${userId}`);
                const data = await response.json();
                if (response.ok) {
                    setPurposes(data);
                    if (data.length === 0) {
                        setMessage('No purposes found. Be the first to post one!');
                    } else {
                        setMessage('');
                    }
                } else {
                    setMessage(data.message || 'Failed to fetch purposes.');
                }
            } catch (error) {
                console.error('Error fetching purposes:', error);
                setMessage('Failed to fetch purposes.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPurposes();
    }, [userId]);

    const currentPurpose = purposes[currentIndex];

    // NEW: Function to remove the current purpose from the list and move to the next one
    const moveNext = () => {
      // Filter out the current purpose to create a new list
      const newPurposes = purposes.filter(
        (purpose, index) => index !== currentIndex
      );
      setPurposes(newPurposes);
      
      // If there are more purposes, stay on the same index, otherwise reset
      if (newPurposes.length > 0) {
        // This is a subtle fix: because we removed an item, the next item is now at the same index
        setCurrentIndex(currentIndex % newPurposes.length);
      } else {
        // If the list is empty, reset the index
        setCurrentIndex(0);
        setMessage('No more purposes to show.');
      }
    };

    // Updated: Function to handle a "swipe left"
    const handleSwipeLeft = async () => {
        if (!currentPurpose) return;
        try {
            const response = await fetch('http://localhost:5000/api/purpose/swipe-left', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, purposeId: currentPurpose.id }),
            });
            const data = await response.json();
            console.log(data.message);
        } catch (error) {
            console.error('Error swiping left:', error);
        } finally {
            moveNext(); // <--- Call our new function to remove the purpose and advance
        }
    };

    // Updated: Function to handle a "swipe right"
    const handleSwipeRight = async () => {
        if (!currentPurpose) return;
        try {
            const response = await fetch('http://localhost:5000/api/purpose/swipe-right', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, purposeId: currentPurpose.id }),
            });
            const data = await response.json();
            alert(data.message);
        } catch (error) {
            console.error('Error swiping right:', error);
        } finally {
            moveNext(); // <--- Call our new function to remove the purpose and advance
        }
    };

    return (
        <div>
            <h2>Browse Purposes</h2>
            {isLoading && <p>Loading...</p>}
            {!isLoading && message && <p>{message}</p>}
            {!isLoading && currentPurpose && (
                <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                    <h3>{currentPurpose.title}</h3>
                    <p>Posted by: {currentPurpose.username}</p>
                    <p>{currentPurpose.description}</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleSwipeLeft}>Swipe Left</button>
                        <button onClick={handleSwipeRight}>Swipe Right</button>
                    </div>
                </div>
            )}
            {!isLoading && !currentPurpose && purposes.length > 0 && <p>You've seen all purposes!</p>}
        </div>
    );
}

export default PurposeSwiper;
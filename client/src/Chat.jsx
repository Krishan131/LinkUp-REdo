import { useState, useEffect, useRef } from 'react';

function Chat({ senderId, receiverId, onBack }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const ws = useRef(null);

    useEffect(() => {
        if (!senderId || !receiverId) {
            console.error("Chat component is missing senderId or receiverId props.");
            return;
        }

        const fetchChatHistory = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/chat/history?user1Id=${senderId}&user2Id=${receiverId}`);
                if (response.ok) {
                    const history = await response.json();
                    setMessages(history);
                }
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
            }
        };

        fetchChatHistory();

        ws.current = new WebSocket(`ws://localhost:5000`);

        ws.current.onopen = () => {
            ws.current.send(JSON.stringify({
                type: 'auth',
                userId: senderId
            }));
            console.log("WebSocket connected and authenticated.");
        };

        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'chatMessage') {
                setMessages(prevMessages => [...prevMessages, message]);
            } else {
                setMessages(prevMessages => [...prevMessages, message]);
            }
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [senderId, receiverId]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || !senderId || !receiverId) {
            console.error("Cannot send message: Missing message text or user IDs.");
            return;
        }

        const message = {
            type: 'chatMessage',
            senderId: senderId,
            receiverId: receiverId,
            text: input,
        };
        ws.current.send(JSON.stringify(message));
        setInput('');
    };

    return (
        <div>
            <button onClick={onBack}>Back to Matches</button>
            <h2>Chat</h2>
            <div style={{ border: '1px solid #ccc', height: '300px', overflowY: 'scroll', padding: '10px', marginBottom: '10px' }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ textAlign: msg.senderId === senderId ? 'right' : 'left' }}>
                        <div style={{ fontSize: '0.8em', color: '#666', marginBottom: '2px' }}>
                            {msg.senderId === senderId ? 'You' : msg.senderName || 'Other'}
                        </div>
                        <p style={{
                            backgroundColor: msg.senderId === senderId ? '#dcf8c6' : '#fff',
                            padding: '8px',
                            borderRadius: '10px',
                            display: 'inline-block',
                            maxWidth: '70%',
                        }}>
                            {msg.text}
                        </p>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSend}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
}

export default Chat;
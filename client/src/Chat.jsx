import { useState, useEffect, useRef } from 'react';
import './Chat.css';

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
                const response = await fetch(`https://linkup-redo-2.onrender.com/api/chat/history?user1Id=${senderId}&user2Id=${receiverId}`);
                if (response.ok) {
                    const history = await response.json();
                    setMessages(history);
                }
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
            }
        };

        fetchChatHistory();

        ws.current = new WebSocket(`wss://linkup-redo-2.onrender.com`);

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
            <button onClick={onBack} className="back-button">Back to Matches</button>
            <h2>Chat</h2>
            <div className="chat-container">
                {messages.map((msg, index) => (
                    <div key={index} className={msg.senderId === senderId ? 'message message-right' : 'message message-left'}>
                        <div className="sender-label">
                            {msg.senderId === senderId ? 'You' : msg.senderName || 'Other'}
                        </div>
                        <p className={msg.senderId === senderId ? 'message-bubble message-bubble-own' : 'message-bubble message-bubble-other'}>
                            {msg.text}
                        </p>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSend} className="chat-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                />
                <button type="submit" className="send-button">Send</button>
            </form>
        </div>
    );
}

export default Chat;
import { useState } from 'react';
import './PurposeForm.css';

function CreatePurposeForm({ userId, onPurposeCreated }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const response = await fetch('https://linkup-redo-2.onrender.com/api/purpose/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, title, description }),
            });

            const data = await response.json();
            setMessage(data.message);

            if (response.ok) {
                // Clear the form fields on success
                setTitle('');
                setDescription('');
                onPurposeCreated(); // Notify parent component (optional for now)
            }
        } catch (error) {
            console.error('Failed to create purpose:', error);
            setMessage('Failed to create purpose. Please try again.');
        }
    };

    return (
        <div className="purpose-form-container">
            <h2 className="purpose-form-title">Post a New Purpose</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label className="purpose-form-label">
                        Title:
                        <input
                            className="purpose-form-input"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </label>
                </div>
                <div>
                    <label className="purpose-form-label">
                        Description:
                        <textarea
                            className="purpose-form-textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="4"
                            required
                        />
                    </label>
                </div>
                <button className="purpose-form-button" type="submit">Post Purpose</button>
            </form>
            {message && (
                <p className={`purpose-form-message ${message.includes('successful') ? 'success' : 'error'}`}>
                    {message}
                </p>
            )}
        </div>
    );
}

export default CreatePurposeForm;

import { useState } from 'react';
import './ProfileForm.css';

function ProfileForm({ userId, onProfileSaved }) {
    const [bio, setBio] = useState('');
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [message, setMessage] = useState('');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('bio', bio);

            if (selectedImage) {
                formData.append('profileImage', selectedImage);
            } else if (profileImageUrl) {
                formData.append('profile_image_url', profileImageUrl);
            }

            const response = await fetch('https://linkup-redo-2.onrender.com/api/profile', {
                method: 'POST',
                body: formData, // Remove Content-Type header to let browser set it with boundary
            });

            const data = await response.json();
            setMessage(data.message);

            // Notify the parent component that the profile was saved
            if (response.ok) {
                onProfileSaved();
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
            setMessage('Failed to save profile. Please try again.');
        }
    };

    return (
        <div className="profile-form-container">
            <h2 className="profile-form-title">Complete Your Profile</h2>
            <form onSubmit={handleSubmit}>
                <div className="profile-photo-container">
                    <div className="profile-photo-circle">
                        {imagePreview ? (
                            <img src={imagePreview} alt="Profile Preview" className="profile-photo-preview" />
                        ) : (
                            <div className="profile-photo-placeholder">📷</div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="profile-photo-input"
                            id="profile-photo-input"
                        />
                    </div>
                    <label htmlFor="profile-photo-input" className="profile-photo-label">
                        Click to upload profile photo
                    </label>
                </div>
                <div>
                    <label className="profile-form-label">
                        Bio:
                        <textarea
                            className="profile-form-textarea"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows="4"
                            cols="50"
                            placeholder="Tell us about yourself..."
                        />
                    </label>
                </div>
                <button className="profile-form-button" type="submit">Save Profile</button>
            </form>
            {message && (
                <p className={`profile-form-message ${message.includes('successful') ? 'success' : 'error'}`}>
                    {message}
                </p>
            )}
        </div>
    );
}

export default ProfileForm;

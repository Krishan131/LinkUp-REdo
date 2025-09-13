import { useState, useEffect } from 'react';
import './ProfileView.css';

function ProfileView({ userId, onProfileUpdate }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
            const response = await fetch(`https://linkup-redo-2.onrender.com/api/profile/${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    setProfile(data);
                    setUsername(data.username || '');
                    setBio(data.bio || '');
                    setProfileImageUrl(data.profile_image_url || '');
                    setImagePreview(data.profile_image_url ? `https://linkup-redo-2.onrender.com${data.profile_image_url}` : null);
                } else {
                    setError('Profile not found. Please complete your profile first.');
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
                setError('Failed to load profile.');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchProfile();
        }
    }, [userId]);

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

    const handleSave = async () => {
        setMessage('');
        const formData = new FormData();
        formData.append('username', username);
        formData.append('bio', bio);
        if (selectedImage) {
            formData.append('profileImage', selectedImage);
        } else if (profileImageUrl) {
            formData.append('profile_image_url', profileImageUrl);
        }

        try {
            console.log('Sending PUT request to:', `http://localhost:5000/api/profile/${userId}`);
            console.log('FormData contents:', { username, bio, hasImage: !!selectedImage, hasImageUrl: !!profileImageUrl });

            const response = await fetch(`https://linkup-redo-2.onrender.com/api/profile/${userId}`, {
                method: 'PUT',
                body: formData,
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            const data = await response.json();
            console.log('Response data:', data);

            setMessage(data.message);

            if (response.ok) {
                setEditMode(false);
                // Refresh profile data
                setProfile({ ...profile, username, bio, profile_image_url: profileImageUrl });
                // Call the callback to refresh user data in parent
                if (onProfileUpdate) {
                    onProfileUpdate();
                }
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            setMessage(`Failed to update profile: ${error.message}`);
        }
    };

    if (loading) {
        return <p>Loading profile...</p>;
    }

    if (error) {
        return (
            <div className="profile-view-container">
                <p className="profile-view-error">{error}</p>
            </div>
        );
    }

    return (
        <div className="profile-view-container">
            <h2 className="profile-view-title">My Profile</h2>
            {editMode ? (
                <div className="profile-view-edit-form">
                    <label>
                        Username:
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="profile-view-input"
                        />
                    </label>
                    <label>
                        Bio:
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="profile-view-textarea"
                            rows="4"
                        />
                    </label>
                    <label>
                        Profile Image:
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="profile-view-file-input"
                        />
                    </label>
                    {imagePreview && (
                        <img src={imagePreview} alt="Preview" className="profile-view-image-preview" />
                    )}
                    <button onClick={handleSave} className="profile-view-save-button">Save</button>
                    <button onClick={() => setEditMode(false)} className="profile-view-cancel-button">Cancel</button>
                    {message && <p className="profile-view-message">{message}</p>}
                </div>
            ) : (
                <div className="profile-view-content">
                    <div className="profile-view-photo">
                        {profile.profile_image_url ? (
                            <img
                                src={`https://linkup-redo-2.onrender.com${profile.profile_image_url}`}
                                alt="Profile"
                                className="profile-view-image"
                            />
                        ) : (
                            <div className="profile-view-placeholder">👤</div>
                        )}
                    </div>
                    <div className="profile-view-info">
                        <h3>Username</h3>
                        <p className="profile-view-username">{profile.username || 'No username set.'}</p>
                        <h3>Bio</h3>
                        <p className="profile-view-bio">
                            {profile.bio || 'No bio provided.'}
                        </p>
                        <button onClick={() => setEditMode(true)} className="profile-view-edit-button">Edit Profile</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfileView;

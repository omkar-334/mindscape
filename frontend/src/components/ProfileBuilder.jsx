import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

const ProfileBuilder = ({ isOpen, onClose, user, onUpdate }) => {
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    race: '',
    city: '',
    state: '',
    sexuality: '',
    preferredTherapistGenders: [],
    pronouns: '',
    location: '' // Added location field for display in profile
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid || !isOpen) return;
      
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Initialize form with existing profile data if available
          setFormData(prevData => ({
            ...prevData,
            ...userData.profileDetails,
            location: userData.location || ''
          }));
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.uid, isOpen]);

  const genderOptions = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'];
  const sexualityOptions = ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Asexual', 'Other', 'Prefer not to say'];
  const pronounOptions = ['He/Him', 'She/Her', 'They/Them', 'Other'];
  const raceOptions = ['Asian', 'Black', 'Hispanic', 'White', 'Mixed', 'Other'];
  const cityOptions = ['Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Ahmedabad', 'Pune', 'Other'];
  const stateOptions = ['Andhra Pradesh', 'Assam', 'Bihar', 'Delhi', 'Goa', 'Gujarat', 'Karnataka', 'Kerala', 'Maharashtra', 'Tamil Nadu', 'Telangana', 'West Bengal', 'Other'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Update location when city or state changes
      ...(name === 'city' || name === 'state' ? {
        location: name === 'city' ? `${value}, ${prev.state}` : `${prev.city}, ${value}`
      } : {})
    }));
  };

  const handleTherapistGenderPreference = (gender) => {
    setFormData(prev => ({
      ...prev,
      preferredTherapistGenders: prev.preferredTherapistGenders.includes(gender)
        ? prev.preferredTherapistGenders.filter(g => g !== gender)
        : [...prev.preferredTherapistGenders, gender]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      
      const userRef = doc(db, 'users', user.uid);
      const updatedData = {
        profileDetails: {
          age: formData.age,
          gender: formData.gender,
          race: formData.race,
          city: formData.city,
          state: formData.state,
          sexuality: formData.sexuality,
          preferredTherapistGenders: formData.preferredTherapistGenders,
          pronouns: formData.pronouns
        },
        location: `${formData.city}, ${formData.state}`,
        profileCompleted: true,
        lastUpdated: new Date()
      };

      await updateDoc(userRef, updatedData);
      onUpdate(updatedData);
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black">Build Your Profile</h2>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-black mb-2">Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select gender</option>
                {genderOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">Pronouns</label>
              <select
                name="pronouns"
                value={formData.pronouns}
                onChange={handleChange}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select pronouns</option>
                {pronounOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">Ethnicity</label>
              <select
                name="race"
                value={formData.race}
                onChange={handleChange}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Ethnicity</option>
                {raceOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">City</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select city</option>
                {cityOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">State</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select state</option>
                {stateOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">Sexuality</label>
              <select
                name="sexuality"
                value={formData.sexuality}
                onChange={handleChange}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select sexuality</option>
                {sexualityOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Preferred Therapist Genders (Select all that apply)
              </label>
              <div className="space-y-2">
                {genderOptions.map(gender => (
                  <label key={gender} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.preferredTherapistGenders.includes(gender)}
                      onChange={() => handleTherapistGenderPreference(gender)}
                      className="rounded text-purple-600 text-black focus:ring-purple-500"
                    />
                    <span className="text-black">{gender}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border text-black border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

ProfileBuilder.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  user: PropTypes.shape({
    uid: PropTypes.string.isRequired
  }).isRequired,
  onUpdate: PropTypes.func.isRequired
};

export default ProfileBuilder;
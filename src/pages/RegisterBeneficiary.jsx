import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const RegisterBeneficiary = () => {
  const [formData, setFormData] = useState({
    cnic: '',
    name: '',
    phone: '',
    address: '',
    familyMembers: '',
    incomeLevel: 'Very Low'
  });
  const [loading, setLoading] = useState(false);
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If staff does not have create permission, redirect them
    if (userData?.role === 'staff' && !userData?.canCreateBeneficiaries) {
      navigate('/unauthorized');
    }
  }, [userData, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cnic') {
      // Only allow digits and limit to 13
      const digitsOnly = value.replace(/\D/g, '').slice(0, 13);
      setFormData({ ...formData, [name]: digitsOnly });
    } else if (name === 'phone') {
      // Only allow digits
      const digitsOnly = value.replace(/\D/g, '');
      setFormData({ ...formData, [name]: digitsOnly });
    } else if (name === 'familyMembers') {
      // Only allow positive numbers
      const numValue = value === '' ? '' : Math.max(1, parseInt(value) || 1);
      setFormData({ ...formData, [name]: numValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.cnic.length !== 13) {
      toast.error('CNIC must be exactly 13 digits');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Phone is required');
      return;
    }

    if (!formData.address.trim()) {
      toast.error('Address is required');
      return;
    }

    if (!formData.familyMembers || formData.familyMembers < 1) {
      toast.error('Family members must be at least 1');
      return;
    }

    setLoading(true);

    try {
      // Check if CNIC already exists
      const beneficiaryRef = doc(db, 'beneficiaries', formData.cnic);
      const beneficiarySnap = await getDoc(beneficiaryRef);

      if (beneficiarySnap.exists()) {
        toast.error('CNIC already registered');
        setLoading(false);
        return;
      }

      // Check role permissions again before creating
      if (userData?.role === 'staff' && !userData?.canCreateBeneficiaries) {
        toast.error('You are not allowed to create beneficiaries');
        setLoading(false);
        return;
      }

      // Create beneficiary document with CNIC as document ID
      await setDoc(beneficiaryRef, {
        cnic: formData.cnic,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        familyMembers: parseInt(formData.familyMembers),
        incomeLevel: formData.incomeLevel
      });

      toast.success('Beneficiary registered successfully!');
      const newBeneficiary = {
        id: formData.cnic,
        cnic: formData.cnic,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        familyMembers: parseInt(formData.familyMembers),
        incomeLevel: formData.incomeLevel,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Reset form
      setFormData({
        cnic: '',
        name: '',
        phone: '',
        address: '',
        familyMembers: '',
        incomeLevel: 'Very Low'
      });

      // Notify other parts of the app so list updates instantly
      window.dispatchEvent(new CustomEvent('beneficiary-created', { detail: newBeneficiary }));
    } catch (error) {
      toast.error('Failed to register beneficiary');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Register Beneficiary</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNIC <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                required
                maxLength={13}
                placeholder="Enter 13-digit CNIC"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.cnic.length}/13 digits</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter full name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="Enter phone number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Enter full address"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Family Members <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="familyMembers"
                value={formData.familyMembers}
                onChange={handleChange}
                required
                min="1"
                placeholder="Enter number of family members"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Income Level <span className="text-red-500">*</span>
              </label>
              <select
                name="incomeLevel"
                value={formData.incomeLevel}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="Very Low">Very Low</option>
                <option value="Low">Low</option>
                <option value="Middle">Middle</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Register Beneficiary'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default RegisterBeneficiary;


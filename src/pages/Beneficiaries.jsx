import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const Beneficiaries = () => {
  const { userData } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = userData?.role === 'admin' || userData?.role === 'super_admin';
  const isStaff = userData?.role === 'staff';

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  // Listen for beneficiary creations from other pages (e.g., Register page)
  useEffect(() => {
    const handleCreated = (e) => {
      const newB = e.detail;
      setBeneficiaries(prev => (prev.some(b => b.id === newB.id) ? prev : [newB, ...prev]));
      toast.success('New beneficiary added');
    };

    window.addEventListener('beneficiary-created', handleCreated);
    return () => window.removeEventListener('beneficiary-created', handleCreated);
  }, []);

  const fetchBeneficiaries = async () => {
    try {
      const beneficiariesSnapshot = await getDocs(collection(db, 'beneficiaries'));
      const beneficiariesList = beneficiariesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBeneficiaries(beneficiariesList);
    } catch (error) {
      toast.error('Failed to fetch beneficiaries');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (beneficiary) => {
    setEditingId(beneficiary.id);
    setEditForm({
      name: beneficiary.name,
      phone: beneficiary.phone,
      address: beneficiary.address,
      familyMembers: beneficiary.familyMembers,
      incomeLevel: beneficiary.incomeLevel
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      await updateDoc(doc(db, 'beneficiaries', id), editForm);
      toast.success('Beneficiary updated successfully');
      setEditingId(null);
      fetchBeneficiaries();
    } catch (error) {
      toast.error('Failed to update beneficiary');
      console.error(error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleApproveReject = async (cnic, action) => {
    // Permission: only admin or super_admin can approve/reject
    if (userData?.role === 'staff') {
      toast.error('You are not allowed to approve/reject beneficiaries');
      return;
    }

    try {
      const beneficiaryRef = doc(db, 'beneficiaries', cnic);

      // Re-check current beneficiary state to prevent race conditions or double-actions
      const currentSnap = await getDoc(beneficiaryRef);
      if (currentSnap.exists()) {
        const data = currentSnap.data();
        const alreadyFinal = data.statusFinalized === true || data.status === 'approved' || data.status === 'rejected';
        if (alreadyFinal) {
          toast.error('This beneficiary has a final status and cannot be changed');
          // Make sure UI reflects the latest server state
          fetchBeneficiaries();
          return;
        }
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // Persist final status flag to prevent future changes
      await updateDoc(beneficiaryRef, { 
        status: newStatus,
        statusUpdatedAt: new Date().toISOString(),
        statusFinalized: true
      });
      
      // Update local state immediately for better UX and mark as finalized
      setBeneficiaries(prev => 
        prev.map(b => 
          b.cnic === cnic ? { ...b, status: newStatus, statusFinalized: true } : b
        )
      );
      
      toast.success(`Beneficiary ${action === 'approve' ? 'approved' : 'rejected'} successfully!`, {
        icon: action === 'approve' ? '✅' : '❌',
        duration: 3000
      });
    } catch (error) {
      toast.error(`Failed to ${action} beneficiary. Please try again.`, {
        duration: 3000
      });
      console.error(error);
      // Refresh list on error to ensure consistency
      fetchBeneficiaries();
    }
  };

  const handleToggleActive = async (cnic, currentStatus) => {
    // Permission: only admin or super_admin can change active status
    if (userData?.role === 'staff') {
      toast.error('You are not allowed to change beneficiary status');
      return;
    }

    try {
      const beneficiaryRef = doc(db, 'beneficiaries', cnic);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateDoc(beneficiaryRef, { status: newStatus });
      toast.success(`Beneficiary marked as ${newStatus}`);
      fetchBeneficiaries();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const filteredBeneficiaries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return beneficiaries;
    return beneficiaries.filter(beneficiary => {
      const name = String(beneficiary.name || '').toLowerCase();
      const cnic = String(beneficiary.cnic || '').toLowerCase();
      const phone = String(beneficiary.phone || '').toLowerCase();
      return name.includes(term) || cnic.includes(term) || phone.includes(term);
    });
  }, [beneficiaries, searchTerm]);

  // Prevent any form submit events originating from within this component from causing navigation
  // Useful if a global listener or other component mistakenly triggers navigation on submit
  useEffect(() => {
    const onSubmitCapture = (e) => {
      // If the submit originated from within our search container, block it
      if (e.target && e.target.closest && e.target.closest('.beneficiaries-search-container')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('submit', onSubmitCapture, true);
    return () => window.removeEventListener('submit', onSubmitCapture, true);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Beneficiaries</h1>
          {(isAdmin || (isStaff && userData?.canCreateBeneficiaries)) && (
            <Link
              to="/register-beneficiary"
              className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              + Register New
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-md p-4 beneficiaries-search-container">
          {/* Prevent accidental navigation by ensuring the search isn't part of any form submission */}
          <form onSubmit={(e) => e.preventDefault()} className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDownCapture={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
              onKeyPressCapture={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
              onKeyUpCapture={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
              placeholder="Search by name, CNIC, or phone..."
              aria-label="Search beneficiaries"
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </form>
          {searchTerm && (
            <p className="text-xs text-gray-500 mt-2">
              Showing {filteredBeneficiaries.length} of {beneficiaries.length} beneficiaries
            </p>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNIC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Family Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Income Level
                  </th>
                  {isAdmin && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBeneficiaries.map((beneficiary) => (
                  <tr key={beneficiary.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {beneficiary.cnic}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingId === beneficiary.id ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      ) : (
                        beneficiary.name
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingId === beneficiary.id ? (
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      ) : (
                        beneficiary.phone
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingId === beneficiary.id ? (
                        <input
                          type="number"
                          value={editForm.familyMembers}
                          onChange={(e) => setEditForm({ ...editForm, familyMembers: parseInt(e.target.value) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      ) : (
                        beneficiary.familyMembers
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingId === beneficiary.id ? (
                        <select
                          value={editForm.incomeLevel}
                          onChange={(e) => setEditForm({ ...editForm, incomeLevel: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        >
                          <option value="Very Low">Very Low</option>
                          <option value="Low">Low</option>
                          <option value="Middle">Middle</option>
                        </select>
                      ) : (
                        beneficiary.incomeLevel
                      )}
                    </td>
                    {isAdmin && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {beneficiary.status ? (
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                beneficiary.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : beneficiary.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {beneficiary.status.charAt(0).toUpperCase() + beneficiary.status.slice(1)}
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )} 
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {editingId === beneficiary.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(beneficiary.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(beneficiary)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleApproveReject(beneficiary.cnic, 'approve')}
                              disabled={beneficiary.status === 'approved' || beneficiary.status === 'rejected'}
                              className={`${
                                (beneficiary.status === 'approved' || beneficiary.status === 'rejected')
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                              } px-3 py-1 rounded transition-colors`}
                              title={beneficiary.status === 'approved' ? 'Already approved' : (beneficiary.status === 'rejected' ? 'Cannot approve a rejected beneficiary' : 'Approve beneficiary')}
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleApproveReject(beneficiary.cnic, 'reject')}
                              disabled={beneficiary.status === 'approved' || beneficiary.status === 'rejected'}
                              className={`${
                                (beneficiary.status === 'approved' || beneficiary.status === 'rejected')
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                              } px-3 py-1 rounded transition-colors`}
                              title={beneficiary.status === 'rejected' ? 'Already rejected' : (beneficiary.status === 'approved' ? 'Cannot reject an approved beneficiary' : 'Reject beneficiary')}
                            >
                              ✗ Reject
                            </button>
                          </>
                        )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredBeneficiaries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? (
              <div>
                <p className="text-lg font-medium">No beneficiaries found matching "{searchTerm}"</p>
                <p className="text-sm mt-2">Try searching with a different term</p>
              </div>
            ) : (
              'No beneficiaries found'
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Beneficiaries;


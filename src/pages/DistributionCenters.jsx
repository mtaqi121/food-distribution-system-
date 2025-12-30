import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';

const DistributionCenters = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const showActiveOnly = params.get('active') === 'true';

  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', address: '' });
  const [editingId, setEditingId] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedCenterStats, setSelectedCenterStats] = useState({ totalSchedules: 0, distributed: 0, pending: 0 });
  const { userData } = useAuth();
  const isStaff = userData?.role === 'staff';
  const navigate = useNavigate();

  useEffect(() => {
    fetchCenters();
  }, [location.search]);

  // Recompute selected center stats whenever schedules or centers change
  useEffect(() => {
    if (!selectedCenter) return;

    // compute stats from foodSchedules
    (async () => {
      try {
        const schedulesSnapshot = await getDocs(collection(db, 'foodSchedules'));
        const list = schedulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const forCenter = list.filter(s => s.distributionCenter === selectedCenter.name);
        const totalSchedules = forCenter.length;
        const distributed = forCenter.filter(s => s.distributedStatus).length;
        const pending = totalSchedules - distributed;
        setSelectedCenterStats({ totalSchedules, distributed, pending });
      } catch (error) {
        console.error(error);
      }
    })();
  }, [selectedCenter, centers]);

  const fetchCenters = async () => {
    setLoading(true);
    try {
      let snapshot;
      if (showActiveOnly) {
        const q = query(collection(db, 'distributionCenters'), where('active', '==', true));
        snapshot = await getDocs(q);
      } else {
        snapshot = await getDocs(collection(db, 'distributionCenters'));
      }
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const filtered = list;

      setCenters(filtered);

      // If a specific center is requested via query param, select it. Otherwise, if we're viewing active centers,
      // auto-select the first active center for quick details view.
      const params = new URLSearchParams(location.search);
      const centerId = params.get('centerId');

      if (centerId) {
        const found = filtered.find(c => c.id === centerId);
        setSelectedCenter(found || null);
      } else {
        setSelectedCenter(null);
      }
    } catch (error) {
      toast.error('Failed to fetch centers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Center name is required');
    setLoading(true);
    try {
      await addDoc(collection(db, 'distributionCenters'), {
        name: form.name.trim(),
        address: form.address.trim(),
        active: true,
        createdAt: new Date().toISOString()
      });
      toast.success('Center added');
      setForm({ name: '', address: '' });
      fetchCenters();
      window.dispatchEvent(new Event('centers-updated'));
    } catch (error) {
      toast.error('Failed to add center');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (center) => {
    setEditingId(center.id);
    setForm({ name: center.name || '', address: center.address || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', address: '' });
  };

  const handleSave = async (id) => {
    if (!form.name.trim()) return toast.error('Center name is required');
    setLoading(true);
    try {
      await updateDoc(doc(db, 'distributionCenters', id), {
        name: form.name.trim(),
        address: form.address.trim()
      });
      toast.success('Center updated');
      setEditingId(null);
      setForm({ name: '', address: '' });
      fetchCenters();
      window.dispatchEvent(new Event('centers-updated'));
    } catch (error) {
      toast.error('Failed to update center');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this center?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'distributionCenters', id));
      toast.success('Center deleted');
      fetchCenters();
      window.dispatchEvent(new Event('centers-updated'));
    } catch (error) {
      toast.error('Failed to delete center');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'distributionCenters', id), {
        active: !currentStatus
      });
      toast.success('Center status updated');
      fetchCenters();
      window.dispatchEvent(new Event('centers-updated'));
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>"
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">{showActiveOnly ? 'Active Distribution Centers' : 'Distribution Centers'}</h1>

        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Center</h2>

          {/* Selected Center Details (if any) */}
          {selectedCenter && (
            <div className="mb-6 p-4 border border-gray-100 rounded bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{selectedCenter.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 break-words">{selectedCenter.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Schedules</p>
                  <p className="text-2xl font-bold text-gray-800">{selectedCenterStats.totalSchedules}</p>
                  <p className="text-xs text-green-600">Distributed: {selectedCenterStats.distributed}</p>
                  <p className="text-xs text-yellow-600">Pending: {selectedCenterStats.pending}</p>
                </div>
              </div>
            </div>
          )}

          {!isStaff ? (
            <form onSubmit={editingId ? (e) => { e.preventDefault(); handleSave(editingId); } : handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingId ? (loading ? 'Saving...' : 'Save Changes') : (loading ? 'Adding...' : 'Add Center')}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-gray-100">Cancel</button>
                )}
              </div>
            </form>
          ) : (
            <div className="text-sm text-gray-500">You have view-only access to centers.</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">All Centers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {centers.map(center => (
                  <tr key={center.id} className={`hover:bg-gray-50 ${selectedCenter?.id === center.id ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => navigate(`?centerId=${center.id}${showActiveOnly ? '&active=true' : ''}`)}
                        className="text-left w-full text-sm text-gray-900 hover:underline"
                      >
                        {center.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{center.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${center.active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {center.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {!isStaff ? (
                        <>
                          <button onClick={() => toggleStatus(center.id, center.active !== false)} className="text-indigo-600 hover:text-indigo-900">{center.active !== false ? 'Deactivate' : 'Activate'}</button>
                          <button onClick={() => startEdit(center)} className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button onClick={() => handleDelete(center.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">View only</span>
                      )}
                    </td>
                  </tr>
                ))} 
                {centers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-gray-500">No centers found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DistributionCenters;

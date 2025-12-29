import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DistributionCenters = () => {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', address: '' });
  const [editingId, setEditingId] = useState(null);
  const { userData } = useAuth();
  const isStaff = userData?.role === 'staff';

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'distributionCenters'));
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCenters(list);
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Distribution Centers</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Center</h2>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {centers.map(center => (
                  <tr key={center.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{center.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{center.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {!isStaff ? (
                        <>
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
                    <td colSpan={3} className="text-center py-6 text-gray-500">No centers found</td>
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

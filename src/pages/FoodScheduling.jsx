import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const FoodScheduling = () => {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [distributionCenters, setDistributionCenters] = useState([]);
  const [centers, setCenters] = useState([]);
  const [formData, setFormData] = useState({
    cnic: '',
    pickupDate: '',
    pickupTime: '',
    distributionCenter: ''
  });
  const { userData } = useAuth();
  const isStaff = userData?.role === 'staff';
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBeneficiaries();
    fetchSchedules();
    fetchCenters();

    const onCentersUpdated = () => fetchCenters();
    window.addEventListener('centers-updated', onCentersUpdated);
    return () => window.removeEventListener('centers-updated', onCentersUpdated);
  }, []);

  const fetchCenters = async () => {
    try {
      const snap = await getDocs(collection(db, 'distributionCenters'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCenters(list);
    } catch (error) {
      toast.error('Failed to fetch centers');
      console.error(error);
    }
  };

  useEffect(() => {
    if (viewParam === 'centers') {
      // Use explicit centers list and compute stats from schedules
      const centersMap = centers.reduce((map, c) => {
        map.set(c.name, {
          name: c.name,
          totalSchedules: 0,
          distributed: 0,
          pending: 0
        });
        return map;
      }, new Map());

      schedules.forEach(schedule => {
        const center = schedule.distributionCenter;
        if (center && centersMap.has(center)) {
          const centerData = centersMap.get(center);
          centerData.totalSchedules++;
          if (schedule.distributedStatus) centerData.distributed++;
          else centerData.pending++;
        }
      });

      setDistributionCenters(Array.from(centersMap.values()));
    }
  }, [viewParam, schedules, centers]);

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
    }
  };

  const fetchSchedules = async () => {
    try {
      const schedulesSnapshot = await getDocs(collection(db, 'foodSchedules'));
      const schedulesList = schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSchedules(schedulesList);
    } catch (error) {
      toast.error('Failed to fetch schedules');
      console.error(error);
    }
  };

  // Use explicit centers collection for available distribution centers
  const availableCenters = useMemo(() => centers.map(c => c.name), [centers]);

  // Compute beneficiaries who are approved and do not currently have any schedule (unscheduled)
  const unscheduledBeneficiaries = useMemo(() => {
    const scheduledSet = new Set(
      schedules.map(s => String(s.cnic))
    );
    return beneficiaries.filter(b => {
      const status = String(b.status || '').toLowerCase();
      const cnic = String(b.cnic || '');
      // Include only approved beneficiaries and exclude any with existing schedules
      return status === 'approved' && cnic && !scheduledSet.has(cnic);
    });
  }, [beneficiaries, schedules]);


  const generateToken = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `SAY-${randomNum}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cnic || formData.cnic.length !== 13) {
      toast.error('Please select a valid beneficiary');
      return;
    }

    if (!formData.pickupDate) {
      toast.error('Please select a pickup date');
      return;
    }

    if (!formData.pickupTime) {
      toast.error('Please select a pickup time');
      return;
    }

    if (!formData.distributionCenter) {
      toast.error('Please select a distribution center');
      return;
    }

    if (availableCenters.length > 0 && !availableCenters.includes(formData.distributionCenter)) {
      toast.error('Please select a valid distribution center');
      return;
    }

    setLoading(true);

    try {
      const token = generateToken();
      
      // Check if token already exists (very unlikely but check anyway)
      const existingSchedules = await getDocs(
        query(collection(db, 'foodSchedules'), where('token', '==', token))
      );
      
      if (!existingSchedules.empty) {
        // Regenerate if duplicate
        const newToken = generateToken();
        await addDoc(collection(db, 'foodSchedules'), {
          cnic: formData.cnic,
          pickupDate: formData.pickupDate,
          pickupTime: formData.pickupTime,
          distributionCenter: formData.distributionCenter.trim(),
          token: newToken,
          distributedStatus: false
        });
        toast.success(`Schedule created with token: ${newToken}`);
      } else {
        await addDoc(collection(db, 'foodSchedules'), {
          cnic: formData.cnic,
          pickupDate: formData.pickupDate,
          pickupTime: formData.pickupTime,
          distributionCenter: formData.distributionCenter.trim(),
          token: token,
          distributedStatus: false
        });
        toast.success(`Schedule created with token: ${token}`);
      }

      setFormData({
        cnic: '',
        pickupDate: '',
        pickupTime: '',
        distributionCenter: ''
      });
      fetchSchedules();
    } catch (error) {
      toast.error('Failed to create schedule');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getBeneficiaryName = (cnic) => {
    const beneficiary = beneficiaries.find(b => b.cnic === cnic);
    return beneficiary ? beneficiary.name : 'Unknown';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Food Scheduling</h1>

        {/* Schedule Form (only for admin/super_admin) */}
        {!isStaff ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Schedule</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Beneficiary (CNIC) <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.cnic}
                  onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select a beneficiary</option>
                  {unscheduledBeneficiaries.length === 0 ? (
                    <option value="" disabled>No unscheduled beneficiaries available</option>
                  ) : (
                    unscheduledBeneficiaries.map((beneficiary) => (
                      <option key={beneficiary.id} value={beneficiary.cnic}>
                        {beneficiary.cnic} - {beneficiary.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.pickupDate}
                    onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.pickupTime}
                    onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distribution Center <span className="text-red-500">*</span>
                </label>
                {availableCenters.length > 0 ? (
                  <select
                    value={formData.distributionCenter}
                    onChange={(e) => setFormData({ ...formData, distributionCenter: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a distribution center</option>
                    {availableCenters.map((center) => (
                      <option key={center} value={center}>{center}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-500">
                    No distribution centers available. Please add centers first or contact an administrator.
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || availableCenters.length === 0 || unscheduledBeneficiaries.length === 0}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Schedule...' : 'Generate Token & Schedule'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Schedules (Read-only)</h2>
            <p className="text-sm text-gray-500">You have read-only access to scheduling. Please contact an administrator to create or modify schedules.</p>
          </div>
        )}

        {/* Distribution Centers View (when view=centers) */}
        {viewParam === 'centers' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Active Distribution Centers</h2>
              <p className="text-sm text-gray-600 mt-1">Total: {distributionCenters.length} centers</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {distributionCenters.map((center, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3">{center.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Schedules:</span>
                      <span className="font-medium">{center.totalSchedules}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distributed:</span>
                      <span className="font-medium text-green-600">{center.distributed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pending:</span>
                      <span className="font-medium text-yellow-600">{center.pending}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {distributionCenters.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No distribution centers found
              </div>
            )}
          </div>
        )}

        {/* Schedules List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Scheduled Distributions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beneficiary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNIC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pickup Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pickup Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distribution Center
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {schedule.token}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getBeneficiaryName(schedule.cnic)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.cnic}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.pickupDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.pickupTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.distributionCenter}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          schedule.distributedStatus
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {schedule.distributedStatus ? 'Distributed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {schedules.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No schedules found
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FoodScheduling;


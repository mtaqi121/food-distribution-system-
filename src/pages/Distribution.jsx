import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Distribution = () => {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const [token, setToken] = useState('');
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [allBeneficiaries, setAllBeneficiaries] = useState([]);
  const [distributedSchedules, setDistributedSchedules] = useState([]);
  const [pendingSchedules, setPendingSchedules] = useState([]);
  const [markingId, setMarkingId] = useState(null);
  const [schedulesTotal, setSchedulesTotal] = useState(0);
  const [showRawSchedules, setShowRawSchedules] = useState(false);

  const { userData, currentUser, hasRole, isStaff, isAdmin, isSuperAdmin } = useAuth();

  useEffect(() => {
    fetchBeneficiaries();
    fetchPendingSchedules();
    fetchDistributedSchedules();
  }, [filterParam, userData]);

  // Auto-search when ?token= is present so users (including staff) can open details by clicking rows
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      handleSearch(tokenParam);
    }
  }, [searchParams]);

  const fetchPendingSchedules = async () => {
    try {
      const schedulesSnapshot = await getDocs(collection(db, 'foodSchedules'));

      const all = schedulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const pending = all.filter(s => s.distributedStatus !== true);

      setSchedulesTotal(schedulesSnapshot.size);
      setPendingSchedules(pending);
    } catch (error) {
      toast.error('Failed to fetch pending schedules');
      console.error(error);
    }
  }; 

  const fetchBeneficiaries = async () => {
    try {
      const beneficiariesSnapshot = await getDocs(collection(db, 'beneficiaries'));
      const beneficiariesList = beneficiariesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllBeneficiaries(beneficiariesList);
      setBeneficiaries(beneficiariesList);
    } catch (error) {
      toast.error('Failed to fetch beneficiaries');
      console.error(error);
    }
  };

  const fetchDistributedSchedules = async () => {
    try {
      const schedulesSnapshot = await getDocs(collection(db, 'foodSchedules'));
      const distributed = schedulesSnapshot.docs
        .filter(doc => doc.data().distributedStatus === true)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      setDistributedSchedules(distributed);

      // set distributed schedules state (count available in distributed.length)
    } catch (error) {
      toast.error('Failed to fetch distributed schedules');
      console.error(error);
    }
  };

  const handleSearch = async (searchToken) => {
    const tokenToSearch = ((searchToken ?? token) || '').trim();
    if (!tokenToSearch) {
      toast.error('Please enter a token');
      return;
    }

    setLoading(true);
    try {
      const schedulesQuery = query(
        collection(db, 'foodSchedules'),
        where('token', '==', tokenToSearch.toUpperCase())
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);

      if (schedulesSnapshot.empty) {
        setSchedule(null);
        toast.error('Token not found');
      } else {
        const scheduleData = schedulesSnapshot.docs[0].data();
        setSchedule({
          id: schedulesSnapshot.docs[0].id,
          ...scheduleData
        });
        setToken(tokenToSearch.toUpperCase());
        toast.success('Token found');
      }
    } catch (error) {
      toast.error('Search failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsDistributed = async (id) => {
    if (!id) return;

    // Role guard on client: only admin or super_admin may mark as distributed
    if (!hasRole(['admin','super_admin'])) {
      toast.error('You do not have permission to mark packages as distributed');
      return;
    }

    setMarkingId(id);
    try {
      await updateDoc(doc(db, 'foodSchedules', id), {
        distributedStatus: true,
        distributedAt: new Date().toISOString(),
        distributedBy: currentUser?.uid || null,
        distributedByName: userData?.name || null
      });
      toast.success('Package marked as Distributed successfully!');
      // Refresh lists
      fetchPendingSchedules();
      fetchDistributedSchedules();
    } catch (error) {
      toast.error('Failed to mark package as distributed');
      console.error(error);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkDistributed = async () => {
    if (!schedule) return;
    await handleMarkAsDistributed(schedule.id);
    setSchedule({ ...schedule, distributedStatus: true, distributedAt: new Date().toISOString() });
  };

  const getBeneficiaryName = (cnic) => {
    const beneficiary = allBeneficiaries.find(b => b.cnic === cnic);
    return beneficiary ? beneficiary.name : 'Unknown';
  };

  const formatDateTime = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return iso;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Food Distribution</h1>

        {/* Diagnostic + quick controls */}
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">Schedules fetched: <span className="font-medium text-gray-800">{schedulesTotal}</span></div>
          <div className="text-sm text-gray-600">Pending: <span className="font-medium text-gray-800">{pendingSchedules.length}</span></div>
          <div className="text-sm text-gray-600">Distributed: <span className="font-medium text-gray-800">{distributedSchedules.length}</span></div>
          <button onClick={() => { fetchPendingSchedules(); fetchDistributedSchedules(); }} className="text-sm text-primary hover:underline">Refresh</button>
          <button onClick={() => setShowRawSchedules(!showRawSchedules)} className="text-sm text-primary hover:underline">{showRawSchedules ? 'Hide raw' : 'Show raw'}</button>
        </div>
        {showRawSchedules && (
          <pre className="mt-3 bg-gray-100 p-3 rounded text-xs overflow-auto max-h-44">{JSON.stringify([...pendingSchedules,...distributedSchedules], null, 2)}</pre>
        )}

        {/* Token Search */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Search Food Token</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.toUpperCase())}
              placeholder="Enter token (e.g., SAY-1234)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent uppercase"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Schedule Details */}
        {schedule && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Schedule Details</h2>
            {isStaff && <div className="text-xs text-blue-600 mb-2">You have read-only access to this schedule.</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Token</p>
                  <p className="text-lg font-semibold text-primary">{schedule.token}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="flex flex-col">
                    <span
                      className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                        schedule.distributedStatus
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {schedule.distributedStatus ? 'Distributed' : 'Pending'}
                    </span>
                    {schedule.distributedStatus && schedule.distributedByName ? (
                      <span className="text-xs text-gray-500 mt-1">by {schedule.distributedByName} • {formatDateTime(schedule.distributedAt)}</span>
                    ) : null}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Beneficiary Name</p>
                  <p className="text-lg font-medium">{getBeneficiaryName(schedule.cnic)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">CNIC</p>
                  <p className="text-lg font-medium">{schedule.cnic}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pickup Date</p>
                  <p className="text-lg font-medium">{schedule.pickupDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pickup Time</p>
                  <p className="text-lg font-medium">{schedule.pickupTime}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Distribution Center</p>
                  <p className="text-lg font-medium">{schedule.distributionCenter}</p>
                </div>
              </div>

              {!schedule.distributedStatus && (userData?.role === 'admin' || userData?.role === 'super_admin') && (
                <button
                  onClick={handleMarkDistributed}
                  className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
                >
                  Mark as Distributed
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pending Packages List */}
        {pendingSchedules.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Pending Packages</h2>
              <p className="text-sm text-gray-600 mt-1">Total pending: {pendingSchedules.length}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distribution Center</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingSchedules.map((sched) => (
                    <tr key={sched.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{sched.token}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getBeneficiaryName(sched.cnic)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sched.cnic}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sched.distributionCenter}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sched.pickupDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sched.pickupTime}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {(userData?.role === 'admin' || userData?.role === 'super_admin') ? (
                          <button
                            onClick={() => handleMarkAsDistributed(sched.id)}
                            disabled={markingId === sched.id}
                            className={`px-3 py-1 rounded text-white ${markingId === sched.id ? 'bg-gray-400' : 'bg-primary hover:bg-green-600'}`}
                            title="Mark this package as distributed"
                          >
                            {markingId === sched.id ? 'Marking...' : 'Mark as Distributed'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">Not allowed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Distributed Packages List (when filter=distributed) */}
        {filterParam === 'distributed' && distributedSchedules.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Distributed Packages</h2>
              <p className="text-sm text-gray-600 mt-1">Total: {distributedSchedules.length} packages</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distribution Center</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {distributedSchedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{schedule.token}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getBeneficiaryName(schedule.cnic)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schedule.cnic}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schedule.distributionCenter}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schedule.pickupDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Distributed</span>
                          {schedule.distributedByName ? (
                            <span className="text-xs text-gray-500 mt-1">by {schedule.distributedByName} • {formatDateTime(schedule.distributedAt)}</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View Beneficiaries (Read-only) */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">View Beneficiaries (Read-only)</h2>
          </div>
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
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Family Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Income Level
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {beneficiaries.map((beneficiary) => (
                  <tr key={beneficiary.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {beneficiary.cnic}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {beneficiary.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {beneficiary.phone}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {beneficiary.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {beneficiary.familyMembers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {beneficiary.incomeLevel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {beneficiaries.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No beneficiaries found
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Distribution;


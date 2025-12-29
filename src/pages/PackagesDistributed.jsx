import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr) return '';
  const date = dateStr;
  const time = timeStr || '';
  return `${date} ${time}`.trim();
};

const isDateInRange = (dateStr, start, end) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  // normalize to start of day
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return dd >= new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() && dd <= new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
};

const PackagesDistributed = () => {
  const [schedules, setSchedules] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [dateFilter, setDateFilter] = useState('all'); // all | today | week | custom
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [centerFilter, setCenterFilter] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const schedulesSnap = await getDocs(collection(db, 'foodSchedules'));
      const schedulesList = schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSchedules(schedulesList);

      const benSnap = await getDocs(collection(db, 'beneficiaries'));
      const benList = benSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBeneficiaries(benList);

      const centersSnap = await getDocs(collection(db, 'distributionCenters'));
      const centersList = centersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCenters(centersList);
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const distributedSchedules = useMemo(() => schedules.filter(s => s.distributedStatus === true), [schedules]);

  // derive stats
  const totalDistributed = distributedSchedules.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const distributedToday = distributedSchedules.filter(s => s.pickupDate === todayStr).length;

  const availableCenters = centers.map(c => c.name);

  // filtered list based on filters
  const filtered = useMemo(() => {
    let list = [...distributedSchedules];

    // center filter
    if (centerFilter) {
      list = list.filter(s => s.distributionCenter === centerFilter);
    }

    // date filter
    if (dateFilter === 'today') {
      list = list.filter(s => s.pickupDate === todayStr);
    } else if (dateFilter === 'week') {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 6); // last 7 days
      const end = today;
      list = list.filter(s => isDateInRange(s.pickupDate, start, end));
    } else if (dateFilter === 'custom') {
      const { start, end } = customRange;
      if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        list = list.filter(s => isDateInRange(s.pickupDate, startDate, endDate));
      }
    }

    return list.sort((a, b) => (a.pickupDate > b.pickupDate ? -1 : 1));
  }, [distributedSchedules, centerFilter, dateFilter, customRange, todayStr]);

  const getBeneficiaryName = (cnic) => {
    const b = beneficiaries.find(x => x.cnic === cnic);
    return b ? b.name : 'Unknown';
  };

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Packages Distributed</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <div className="text-gray-600">Total Packages Distributed</div>
              <div className="text-2xl font-bold">{totalDistributed}</div>
            </div>
            <div className="text-sm">
              <div className="text-gray-600">Packages Distributed Today</div>
              <div className="text-2xl font-bold">{distributedToday}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Date Filter</label>
              <select className="w-full px-3 py-2 border rounded" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Distribution Center</label>
              <select className="w-full px-3 py-2 border rounded" value={centerFilter} onChange={(e) => setCenterFilter(e.target.value)}>
                <option value="">All Centers</option>
                {availableCenters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex gap-2">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Start</label>
                  <input type="date" className="px-3 py-2 border rounded" value={customRange.start} onChange={(e) => setCustomRange({...customRange, start: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">End</label>
                  <input type="date" className="px-3 py-2 border rounded" value={customRange.end} onChange={(e) => setCustomRange({...customRange, end: e.target.value})} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-auto">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Distributed Packages</h2>
            <p className="text-sm text-gray-500 mt-1">Showing {filtered.length} of {totalDistributed} distributed packages</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distribution Center</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getBeneficiaryName(item.cnic)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cnic}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.distributionCenter}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.pickupDate, item.pickupTime)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.distributedStatus ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {item.distributedStatus ? 'Distributed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-500">No distributed packages found</td>
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

export default PackagesDistributed;

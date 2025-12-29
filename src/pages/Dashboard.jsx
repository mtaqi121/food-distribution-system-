import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalBeneficiaries: 0,
    distributedToday: 0,
    activeCenters: 0,
    totalDistributed: 0
  });
  const [searchCnic, setSearchCnic] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Total beneficiaries
      const beneficiariesSnapshot = await getDocs(collection(db, 'beneficiaries'));
      const totalBeneficiaries = beneficiariesSnapshot.size;

      // Distributed today and total distributed
      const today = new Date().toISOString().split('T')[0];
      const schedulesSnapshot = await getDocs(collection(db, 'foodSchedules'));
      const distributedToday = schedulesSnapshot.docs.filter(
        doc => doc.data().distributedStatus === true && doc.data().pickupDate === today
      ).length;
      const totalDistributed = schedulesSnapshot.docs.filter(
        doc => doc.data().distributedStatus === true
      ).length;

      // Active centers (unique distribution centers)
      const centers = new Set();
      schedulesSnapshot.docs.forEach(doc => {
        const center = doc.data().distributionCenter;
        if (center) centers.add(center);
      });

      setStats({
        totalBeneficiaries,
        distributedToday,
        activeCenters: centers.size,
        totalDistributed
      });
    } catch (error) {
      toast.error('Failed to fetch statistics');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchCnic || searchCnic.length !== 13) {
      toast.error('Please enter a valid 13-digit CNIC');
      return;
    }

    try {
      const beneficiaryDoc = await getDocs(
        query(collection(db, 'beneficiaries'), where('cnic', '==', searchCnic))
      );

      if (beneficiaryDoc.empty) {
        setSearchResult(null);
        toast.error('Beneficiary not found');
      } else {
        const data = beneficiaryDoc.docs[0].data();
        setSearchResult(data);
        toast.success('Beneficiary found');
      }
    } catch (error) {
      toast.error('Search failed');
      console.error(error);
    }
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
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Total Beneficiaries Card */}
          <div 
            onClick={() => navigate('/beneficiaries')}
            className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-primary cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 active:scale-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-xs md:text-sm font-medium">Total Beneficiaries</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">{stats.totalBeneficiaries}</p>
                <p className="text-xs text-primary mt-1 md:mt-2 font-medium hidden sm:block">Click to view all →</p>
              </div>
              <div className="text-3xl md:text-4xl ml-2 flex-shrink-0">👥</div>
            </div>
          </div>

          {/* Packages Distributed Card */}
          <div 
            onClick={() => { if (userData?.role === 'staff') return; navigate('/packages-distributed'); }}
            className={`bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-blue-500 transition-all duration-200 active:scale-100 ${userData?.role === 'staff' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:scale-105'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-xs md:text-sm font-medium">Packages Distributed</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">{stats.totalDistributed}</p>
                <p className="text-xs text-blue-500 mt-1 md:mt-2 font-medium hidden sm:block">Click to view details →</p>
              </div>
              <div className="text-3xl md:text-4xl ml-2 flex-shrink-0">📦</div>
            </div>
          </div>

          {/* Active Distribution Centers Card */}
          <div 
            onClick={() => navigate('/schedule?view=centers')}
            className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-yellow-500 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 active:scale-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 text-xs md:text-sm font-medium">Active Distribution Centers</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">{stats.activeCenters}</p>
                <p className="text-xs text-yellow-600 mt-1 md:mt-2 font-medium hidden sm:block">Click to view centers →</p>
              </div>
              <div className="text-3xl md:text-4xl ml-2 flex-shrink-0">🏢</div>
            </div>
          </div>
        </div>

        {/* CNIC Search */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">Search Beneficiary by CNIC</h2>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <input
              type="text"
              value={searchCnic}
              onChange={(e) => setSearchCnic(e.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder="Enter 13-digit CNIC"
              className="w-full sm:flex-1 px-4 py-2.5 md:py-2 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              maxLength={13}
            />
            <button
              onClick={handleSearch}
              className="w-full sm:w-auto bg-primary text-white px-6 py-2.5 md:py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors text-base md:text-sm whitespace-nowrap"
            >
              Search
            </button>
          </div>

          {searchResult && (
            <div className="mt-4 md:mt-6 p-4 md:p-6 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3 text-base md:text-lg">Beneficiary Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-sm md:text-base">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-600 font-medium sm:font-normal">Name:</span>
                  <span className="sm:ml-2 font-medium mt-1 sm:mt-0 break-words">{searchResult.name}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-600 font-medium sm:font-normal">CNIC:</span>
                  <span className="sm:ml-2 font-medium mt-1 sm:mt-0 break-all">{searchResult.cnic}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-600 font-medium sm:font-normal">Phone:</span>
                  <span className="sm:ml-2 font-medium mt-1 sm:mt-0 break-all">{searchResult.phone}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-600 font-medium sm:font-normal">Family Members:</span>
                  <span className="sm:ml-2 font-medium mt-1 sm:mt-0">{searchResult.familyMembers}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-600 font-medium sm:font-normal">Income Level:</span>
                  <span className="sm:ml-2 font-medium mt-1 sm:mt-0">{searchResult.incomeLevel}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start col-span-1 sm:col-span-2">
                  <span className="text-gray-600 font-medium sm:font-normal">Address:</span>
                  <span className="sm:ml-2 font-medium mt-1 sm:mt-0 break-words">{searchResult.address}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;


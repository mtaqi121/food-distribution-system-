import { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [preservedUser, setPreservedUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If we're creating a user, preserve the current session in UI
      if (isCreatingUser && preservedUser) {
        // Don't update state, keep the preserved user in UI
        // Note: The actual Firebase auth session is lost, but we preserve UI state
        return;
      }

      if (user) {
        setCurrentUser(user);
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          setUserData(null);
        }
      } else {
        // Only clear if we're not creating a user
        if (!isCreatingUser) {
          setCurrentUser(null);
          setUserData(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [isCreatingUser, preservedUser]);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data();
      if (userData.status === 'inactive') {
        await signOut(auth);
        throw new Error('Your account has been deactivated');
      }

      toast.success('Login successful!');
      return userCredential.user;
    } catch (error) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
      throw error;
    }
  };

  const createUser = async (email, password, name, role) => {
    try {
      // Preserve current user session
      const currentUserBefore = auth.currentUser;
      const currentUserDataBefore = userData;
      
      if (currentUserBefore && currentUserDataBefore) {
        setIsCreatingUser(true);
        setPreservedUser({ user: currentUserBefore, data: currentUserDataBefore });
      }

      // Check if email already exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setIsCreatingUser(false);
        setPreservedUser(null);
        throw new Error('Email already exists');
      }

      // Create auth user (this will automatically sign in the new user)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name,
        email,
        role,
        status: 'active',
        createdAt: serverTimestamp()
      });

      // Sign out the newly created user immediately
      await signOut(auth);

      // Restore preserved user session
      if (preservedUser) {
        // Restore the state manually since we prevented onAuthStateChanged from updating
        setCurrentUser(preservedUser.user);
        setUserData(preservedUser.data);
      }

      // Reset flags
      setIsCreatingUser(false);
      setPreservedUser(null);

      toast.success(`${role} account created successfully`);
      return userCredential.user;
    } catch (error) {
      // Reset flags on error
      setIsCreatingUser(false);
      setPreservedUser(null);
      toast.error(error.message || 'Failed to create user');
      throw error;
    }
  };

  const value = {
    currentUser,
    userData,
    loading,
    login,
    logout,
    createUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};


import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  setPersistence,
  inMemoryPersistence,
  getAuth as getAuthFromApp
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
import { auth, db, firebaseConfig } from '../firebase/firebase';
import toast from 'react-hot-toast';

// Map Firebase auth errors to user-friendly messages and indicate affected field
function sanitizeAuthError(error) {
  const code = (error && error.code) || null;
  const message = (error && error.message) || '';

  const map = {
    'auth/user-not-found': { message: 'No account found with that email address. Please check your email.', field: 'email' },
    'auth/wrong-password': { message: 'Incorrect password. Please try again.', field: 'password' },
    'auth/invalid-email': { message: 'Invalid email address format.', field: 'email' },
    'auth/user-disabled': { message: 'This account has been disabled. Please contact support.', field: 'general' },
    'auth/too-many-requests': { message: 'Too many unsuccessful login attempts. Please try again later.', field: 'general' },
    'auth/network-request-failed': { message: 'Network error. Please check your internet connection and try again.', field: 'general' },
    'auth/email-already-in-use': { message: 'An account with this email already exists.', field: 'email' },
    'auth/weak-password': { message: 'Password is too weak. It must be at least 6 characters.', field: 'password' },
    default: { message: 'Operation failed. Please check your email and password and try again.', field: 'general' }
  };

  if (code && map[code]) return { code, ...map[code] };

  // Handle some custom thrown messages
  if (message.includes('Email already exists')) return { code: 'custom/email-already-exists', message: map['auth/email-already-in-use'].message, field: 'email' };
  if (message.includes('User data not found')) return { code: 'custom/user-data-not-found', message: 'Account not found. Please contact support.', field: 'email' };

  return { code: code || 'unknown', ...map.default };
}

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
      const { message, field, code } = sanitizeAuthError(error);
      // Show a user-friendly message (explicitly indicates if it's an email or password issue)
      toast.error(message);
      const e = new Error(message);
      e.code = code;
      e.field = field;
      throw e;
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
      // Check if email already exists in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error('Email already exists');
      }

      // Create a temporary/secondary Firebase app and auth instance
      // Use in-memory persistence so the created user does not persist or affect the main session
      const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
      const secondaryAuth = getAuthFromApp(secondaryApp);

      try {
        await setPersistence(secondaryAuth, inMemoryPersistence);
        // Create the user on the secondary auth instance (this won't affect the primary auth session)
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);

        // Create user document in Firestore using the main db instance
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          name,
          email,
          role,
          status: 'active',
          createdAt: serverTimestamp()
        });

        toast.success(`${role} account created successfully`);
        return userCredential.user;
      } finally {
        // Clean up: sign out and delete the secondary app
        try {
          await signOut(secondaryAuth);
        } catch (e) {
          // ignore
        }
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      const { message, field, code } = sanitizeAuthError(error);
      toast.error(message);
      const e = new Error(message);
      e.code = code;
      e.field = field;
      throw e;
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


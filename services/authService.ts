import { auth, db, firebaseConfig } from './firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  User,
  getAuth
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { UserProfile, UserRole } from '../types.ts';

class AuthService {
  private currentUser: User | null = null;
  private userProfile: UserProfile | null = null;
  private listeners: ((user: User | null, profile: UserProfile | null) => void)[] = [];
  private authStateResolved = false;

  constructor() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        this.userProfile = await this.getUserProfile(user.uid);
      } else {
        this.userProfile = null;
      }
      this.authStateResolved = true;
      this.notify();
    });
  }

  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      this.userProfile = await this.getUserProfile(userCredential.user.uid);
      this.notify();
      return userCredential.user;
    } catch (error: any) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async logout() {
    await signOut(auth);
    this.currentUser = null;
    this.userProfile = null;
    this.notify();
  }

  async forgotPassword(email: string) {
    const actionCodeSettings = {
      // URL you want to redirect back to. The query parameter 'oobCode' will be appended.
      url: `${import.meta.env.VITE_APP_URL}/#/reset-password`,
      handleCodeInApp: true,
    };
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  }

  async verifyResetCode(code: string) {
    return await verifyPasswordResetCode(auth, code);
  }

  async confirmReset(code: string, newPassword: string) {
    await confirmPasswordReset(auth, code, newPassword);
  }

  private async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  }

  subscribe(listener: (user: User | null, profile: UserProfile | null) => void) {
    this.listeners.push(listener);
    if (this.authStateResolved) {
      listener(this.currentUser, this.userProfile);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentUser, this.userProfile));
  }

  // --- Admin Logic ---

  private isInitialized = false;

  async ensureAdminInitialized() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    if (!adminEmail) return;

    try {
      // Check if any user exists with this email in the 'users' collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', adminEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("Admin not found in Firestore. Checking if account can be created...");
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, "admin123");
          const profile: UserProfile = {
            uid: userCredential.user.uid,
            email: adminEmail,
            name: "Administrator",
            role: 'admin',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', userCredential.user.uid), profile);
          console.log("Initial admin created successfully.");
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            console.log("Admin user already exists in Auth. You can log in with administrator credentials.");
          } else {
            console.error("Failed to create initial admin:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error during admin initialization check:", error);
    }
  }

  async addUser(userData: { email: string, name: string, whatsappNumber: string, role: UserRole }) {
    if (this.userProfile?.role !== 'admin') throw new Error("Unauthorized");
    await this.inviteUser(userData);
  }

  private async inviteUser(userData: { email: string, name: string, whatsappNumber: string, role: UserRole }) {
    const secondaryAppName = `InviteApp_${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const tempPassword = Math.random().toString(36).slice(-12) + "!";
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, tempPassword);
      const uid = userCredential.user.uid;

      const profile: UserProfile = {
        uid,
        email: userData.email,
        name: userData.name,
        whatsappNumber: userData.whatsappNumber,
        role: userData.role,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', uid), profile);

      const actionCodeSettings = {
        url: `${window.location.origin}/#/reset-password`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, userData.email, actionCodeSettings);
      console.log(`User ${userData.email} created and reset email sent.`);
    } finally {
      await deleteApp(secondaryApp);
    }
  }
}

export const authService = new AuthService();

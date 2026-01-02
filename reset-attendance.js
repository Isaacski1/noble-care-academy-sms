import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCHlCLhumJn50nw2JBgJTGeIH_6GKzjFbA",
  authDomain: "noble-care-management-system.firebaseapp.com",
  projectId: "noble-care-management-system",
  storageBucket: "noble-care-management-system.firebasestorage.app",
  messagingSenderId: "573085015524",
  appId: "1:573085015524:web:29ae8a509813ec1199fbf1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function resetAttendance() {
  try {
    const attendanceRef = collection(db, 'attendance');
    const querySnapshot = await getDocs(attendanceRef);

    const deletePromises = querySnapshot.docs.map(document => deleteDoc(doc(db, 'attendance', document.id)));

    await Promise.all(deletePromises);

    console.log('All attendance records deleted successfully.');
  } catch (error) {
    console.error('Error deleting attendance records:', error);
  }
}

resetAttendance();
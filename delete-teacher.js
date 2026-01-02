import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

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

async function deleteTeacher() {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('name', '==', 'rose'), where('email', '==', 'rose@gmail.com'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('Teacher not found.');
      return;
    }

    querySnapshot.forEach(async (document) => {
      await deleteDoc(doc(db, 'users', document.id));
      console.log('Teacher deleted successfully.');
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
  }
}

deleteTeacher();
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

async function resetTeachers() {
  try {
    console.log('Starting teacher reset...');

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'TEACHER'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No teachers found to reset.');
      return;
    }

    const deletePromises = querySnapshot.docs.map(async (document) => {
      console.log(`Deleting teacher: ${document.data().name} (${document.data().email})`);
      return deleteDoc(doc(db, 'users', document.id));
    });

    await Promise.all(deletePromises);
    console.log(`✅ Successfully deleted ${querySnapshot.docs.length} teacher(s).`);

  } catch (error) {
    console.error('❌ Error resetting teachers:', error);
  }
}

resetTeachers();
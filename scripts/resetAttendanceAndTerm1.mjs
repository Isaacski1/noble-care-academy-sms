import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCHlCLhumJn50nw2JBgJTGeIH_6GKzjFbA",
  authDomain: "noble-care-management-system.firebaseapp.com",
  projectId: "noble-care-management-system",
  storageBucket: "noble-care-management-system.firebasestorage.app",
  messagingSenderId: "573085015524",
  appId: "1:573085015524:web:29ae8a509813ec1199fbf1"
};

initializeApp(firebaseConfig);
const firestore = getFirestore();

async function deleteAllAttendance() {
  console.log('Deleting all attendance records...');
  const snap = await getDocs(collection(firestore, 'attendance'));
  const ops = snap.docs.map(d => deleteDoc(doc(firestore, 'attendance', d.id)));
  await Promise.all(ops);
  console.log(`Deleted ${snap.docs.length} attendance records.`);
}

async function deleteAssessmentsForTerm(term = 1) {
  console.log(`Deleting assessments for term ${term}...`);
  const q = query(collection(firestore, 'assessments'), where('term', '==', term));
  const snap = await getDocs(q);
  const ops = snap.docs.map(d => deleteDoc(doc(firestore, 'assessments', d.id)));
  await Promise.all(ops);
  console.log(`Deleted ${snap.docs.length} assessments for term ${term}.`);
}

(async () => {
  try {
    await deleteAllAttendance();
    await deleteAssessmentsForTerm(1);
    console.log('Reset complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during reset:', err);
    process.exit(1);
  }
})();

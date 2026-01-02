import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';

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

const CLASSES_LIST = [
  { id: 'c_n1', name: 'Nursery 1' },
  { id: 'c_n2', name: 'Nursery 2' },
  { id: 'c_kg1', name: 'KG 1' },
  { id: 'c_kg2', name: 'KG 2' },
  { id: 'c_p1', name: 'Class 1' },
  { id: 'c_p2', name: 'Class 2' },
  { id: 'c_p3', name: 'Class 3' },
  { id: 'c_p4', name: 'Class 4' },
  { id: 'c_p5', name: 'Class 5' },
  { id: 'c_p6', name: 'Class 6' },
  { id: 'c_jhs1', name: 'JHS 1' },
  { id: 'c_jhs2', name: 'JHS 2' },
  { id: 'c_jhs3', name: 'JHS 3' },
];

const DEFAULT_SUBJECTS = [
  "Mathematics",
  "English Language",
  "Integrated Science",
  "Social Studies",
  "ICT",
  "RME",
  "Ghanaian Language",
  "Creative Arts"
];

const CURRENT_TERM = 1;
const ACADEMIC_YEAR = '2023-2024';

async function resetForClass(classId) {
  console.log(`Processing ${classId}...`);
  const q = query(collection(firestore, 'assessments'), where('classId', '==', classId));
  const snap = await getDocs(q);
  // delete
  const deletes = snap.docs.map(d => deleteDoc(doc(firestore, 'assessments', d.id)));
  await Promise.all(deletes);
  console.log(`Deleted ${snap.docs.length} assessments for ${classId}`);

  // seed defaults: fetch students
  const studentsQ = query(collection(firestore, 'students'), where('classId', '==', classId));
  const studentsSnap = await getDocs(studentsQ);
  const students = studentsSnap.docs.map(d => d.data());

  const ops = [];
  for (const student of students) {
    for (const subject of DEFAULT_SUBJECTS) {
      const id = `${student.id}_${subject}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      const assessment = {
        id,
        studentId: student.id,
        classId,
        term: CURRENT_TERM,
        academicYear: ACADEMIC_YEAR,
        subject,
        testScore: 0,
        homeworkScore: 0,
        projectScore: 0,
        examScore: 0,
        total: 0
      };
      ops.push(setDoc(doc(firestore, 'assessments', id), assessment));
    }
  }

  await Promise.all(ops);
  console.log(`Seeded ${ops.length} default assessments for ${classId}`);
}

(async () => {
  try {
    console.log('Starting reset for all classes. This will delete and reseed assessments.');
    for (const cls of CLASSES_LIST) {
      await resetForClass(cls.id);
    }
    console.log('Reset complete for all classes.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();

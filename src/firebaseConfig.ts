export const firebaseConfig = {
  apiKey: "AIzaSyAYaFwPyPdByhvMYGKw5Gr2vm9xJgCZdfo",
  authDomain: "medimind-eb814.firebaseapp.com",
  projectId: "medimind-eb814",
  storageBucket: "medimind-eb814.firebasestorage.app",
  messagingSenderId: "270375464494",
  appId: "1:270375464494:web:283492bc8776cb67e639bf",
  measurementId: ""
};

export function hasFirebaseConfig() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

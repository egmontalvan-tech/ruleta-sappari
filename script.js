import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD4anQngP2eDrG1QCfoeSkanidlvOc6k9E",
    authDomain: "sappari.firebaseapp.com",
    projectId: "sappari",
    storageBucket: "sappari.firebasestorage.app",
    messagingSenderId: "353921307187",
    appId: "1:353921307187:web:c475868367b1e68ee40946",
    measurementId: "G-4X05BCVFEG"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.query = query;
window.where = where;
window.getDocs = getDocs;

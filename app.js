// Firebase se inicializa en index.html - eliminando duplicación
const auth = firebase.auth();
const db = firebase.database();

// VARIABLES GLOBALES
const MASTER_ADMIN = '7scasma@gmail.com'; // El único que puede gestionar usuarios
let currentSection = "packs";
let allPacks = [];
let dbListener = null;

// --- GESTIÓN DE AUTENTICACIÓN ---

function handleLogin() { 
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
}

function handleLogout() { auth.signOut().then(() => location.reload()); }

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const isAuthorized = await checkUserAccess(user.email);
        
        if (isAuthorized) {
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('appSection').classList.remove('hidden');
            
            const isAdmin = (user.email === MASTER_ADMIN);
            document.getElementById('userStatus').innerText = isAdmin ? "MODO ADMINISTRADOR" : "ACCESO PRO ACTIVO";
            
            if (isAdmin) {
                document.getElementById('adminUploadBtn').classList.remove('hidden');
                document.body.classList.add('is-admin');
                loadAuthorizedUsers(); // Cargar lista de correos en el panel admin
            }
            loadPacks();
        } else {
            alert("Tu correo no tiene acceso. Contacta al administrador.");
            auth.signOut();
        }
    }
});

// Verificar si el correo está en la base de datos
async function checkUserAccess(email) {
    if (email === MASTER_ADMIN) return true;
    const snapshot = await db.ref('authorized_users').once('value');
    const users = snapshot.val() || {};
    return Object.values(users).includes(email.toLowerCase());
}

// --- GESTIÓN DE USUARIOS (SOLO ADMIN) ---

function addUserEmail() {
    const emailInput = document.getElementById('newUserEmail');
    const email = emailInput.value.trim().toLowerCase();
    if (!email.includes('@')) return alert("Correo inválido");

    db.ref('authorized_users').push(email).then(() => {
        emailInput.value = '';
        alert("Usuario autorizado con éxito");
    });
}

function removeUserEmail(key) {
    if (confirm("¿Quitar acceso a este correo?")) {
        db.ref('authorized_users').child(key).remove();
    }
}

function loadAuthorizedUsers() {
    db.ref('authorized_users').on('value', snap => {
        const list = document.getElementById('usersList');
        list.innerHTML = '';
        const data = snap.val() || {};
        Object.keys(data).forEach(key => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5";
            div.innerHTML = `
                <span class="text-[10px] font-bold text-slate-300">${data[key]}</span>
                <button onclick="removeUserEmail('${key}')" class="text-red-500 font-black text-[10px]">BORRAR</button>
            `;
            list.appendChild(div);
        });
    });
}

// --- LÓGICA DE CONTENIDO (PACKS) ---

function changeSection(section) {
    currentSection = section;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${section}`)?.classList.add('active');
    toggleView('gallery');
    loadPacks();
}

function toggleView(view) {
    ['gallery', 'explorer', 'admin'].forEach(v => document.getElementById(`view-${v}`).classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
}

function loadPacks() {
    if (dbListener) db.ref(currentSection).off();
    dbListener = db.ref(currentSection).on('value', snap => {
        allPacks = [];
        const data = snap.val() || {};
        Object.keys(data).forEach(id => allPacks.push({ id, ...data[id] }));
        allPacks.sort((a, b) => new Date(b.originalDate) - new Date(a.originalDate));
        renderPacks(allPacks);
    });
}


// --- EXPLORADOR Y DESCARGAS ---
let navHistory = [];
function openFolder(data) {
    toggleView('explorer');
    navHistory.push(data);
    document.getElementById('folderTitle').innerText = data.name;
    const container = document.getElementById('contentList');
    container.innerHTML = '';

    if (data.packages) {
        data.packages.forEach(sub => {
            const row = document.createElement('div');
            row.className = 'item-row p-5 rounded-2xl flex justify-between items-center cursor-pointer';
            row.onclick = () => openFolder(sub);
            row.innerHTML = `<span class="text-[10px] font-black uppercase">📁 ${sub.name}</span> <span class="text-blue-500 font-bold text-[9px]">ENTRAR</span>`;
            container.appendChild(row);
        });
    }

    if (data.remixes) {
        data.remixes.forEach(f => {
            const row = document.createElement('div');
            row.className = 'item-row p-5 rounded-2xl flex justify-between items-center';
            row.innerHTML = `
                <span class="text-[10px] font-bold uppercase">${f.name}</span>
                <a href="https://api.perubpm.com/catalog/drive/download/${f.referenceId}?fileName=${encodeURIComponent(f.name)}" target="_blank" class="bg-blue-600 px-4 py-2 rounded-lg text-[9px] font-black">DESCUALGAR</a>
            `;
            container.appendChild(row);
        });
    }
}

function goBack() {
    navHistory.pop();
    if (navHistory.length === 0) toggleView('gallery');
    else openFolder(navHistory.pop());
}

// --- BUSCADOR ---
async function filterPacks() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    if (q.length < 3) return;
    // Implementación simplificada de búsqueda en allPacks...
}

function deletePack(id, e) {
    e.stopPropagation();
    if(confirm("¿Eliminar pack definitivamente?")) db.ref(currentSection).child(id).remove();
}
// Mapa de imágenes por categorías (Coincidencia por nombre)
const imageMap = {
    "dj city latino": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe5dd32f460477bca687da.jpg",
    "dj city": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe5dd32f460477bca687da.jpg",
    "rompe discoteca": "https://perubpm.blob.core.windows.net/static/assets/categories/68fdd4222f460477bca687d2.jpg",
    "just play": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe610a2f460477bca687df.jpg",
    "latin remixes": "https://perubpm.blob.core.windows.net/static/assets/categories/68fd936a6f8c5f58eb8a965d.jpg",
    "dale mas bajo": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe5b652f460477bca687d9.jpg",
    "bpm latino": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe59032f460477bca687d6.jpg",
    "latin box": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe61502f460477bca687e0.jpg",
    "urban zone": "https://perubpm.blob.core.windows.net/static/assets/categories/6933ecf34a14be5b3b3c32a8.jpg",
    "unlimited latin": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe63092f460477bca687e5.jpg",
    "cuban pool": "https://perubpm.blob.core.windows.net/static/assets/categories/6933ee8a4a14be5b3b3c32a9.jpg",
    "heavy hits": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe602b2f460477bca687dd.jpg",
    "europa remix": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe5f5d2f460477bca687db.jpg",
    "extended latino": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe5fbc2f460477bca687dc.jpg",
    "pro latin remix": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe61ff2f460477bca687e2.jpg",
    "themashup": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe62912f460477bca687e4.jpg",
    "the mashup": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe62912f460477bca687e4.jpg",
    "especial pack": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe61b92f460477bca687e1.jpg",
    "cuba remixes": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe5b052f460477bca687d8.jpg",
    "8th wonder": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe56b82f460477bca687d4.jpg",
    "otros": "https://perubpm.blob.core.windows.net/static/assets/categories/68fe61b92f460477bca687e1.jpg"
};

function renderPacks(packsArray) {
    const grid = document.getElementById('view-gallery');
    grid.innerHTML = '';
    let lastMonthLabel = "";

    packsArray.forEach(item => {
        const pack = item.data;
        const packNameLower = (pack.name || "").toLowerCase();
        const itemDate = new Date(item.originalDate);
        const monthLabel = itemDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

        // 1. Lógica de Separadores por Mes
        if (monthLabel !== lastMonthLabel) {
            lastMonthLabel = monthLabel;
            const divider = document.createElement('div');
            divider.className = "month-divider";
            divider.innerHTML = `<h3 class="text-xs font-black italic tracking-[0.3em] text-blue-400">${monthLabel}</h3>`;
            grid.appendChild(divider);
        }

        // 2. Lógica de Coincidencia de Imágenes
        let coverUrl = item.customImage || ""; // Prioridad a la imagen puesta manualmente en el Panel Admin
        
        if (!coverUrl) {
            // Si no hay imagen manual, buscamos en el mapa por nombre
            for (const key in imageMap) {
                if (packNameLower.includes(key)) {
                    coverUrl = imageMap[key];
                    break;
                }
            }
        }
        
        // Si sigue sin haber imagen, usamos la de "otros"
        if (!coverUrl) coverUrl = imageMap["otros"];

        // 3. Renderizado de la Card
        const div = document.createElement('div');
        div.className = "pack-card p-8";
        div.innerHTML = `
            <div class="admin-controls">
                <button onclick="editPackDate('${item.id}', '${item.originalDate}', event)" class="admin-btn edit-btn">FECHA</button>
                <button onclick="deletePack('${item.id}', event)" class="admin-btn del-btn">BORRAR</button>
            </div>
            <div onclick="openPackById('${item.id}')">
                <div class="aspect-square bg-slate-900 rounded-3xl mb-6 border border-white/5 overflow-hidden">
                    <img src="${coverUrl}" class="w-full h-full object-cover" loading="lazy">
                </div>
                <h4 class="text-[11px] font-black uppercase truncate">${pack.name}</h4>
                <div class="flex justify-between items-center mt-3">
                    <p class="text-[8px] text-blue-500 font-black uppercase tracking-widest italic">Ver Contenido</p>
                    <span class="text-[10px] text-slate-400 font-black uppercase">${itemDate.toLocaleDateString('es-ES', {day:'2-digit', month:'short'}).toUpperCase()}</span>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
}
function openPackById(id) {
    // 1. Buscamos el pack en el array global (asegúrate de que tu array se llame 'allPacks')
    const packItem = allPacks.find(p => p.id === id);
    
    if (packItem) {
        const pack = packItem.data;
        
        // 2. Aquí va la lógica para mostrar el contenido. 
        // Por ejemplo, si usas un modal o una sección de detalles:
        console.log("Abriendo pack:", pack.name);
        
        // Si tienes una función para mostrar el modal del pack, llámala aquí:
        // showPackModal(pack); 
        
        // O si simplemente rediriges a un link de Drive/Mega:
        if (pack.url) {
            window.open(pack.url, '_blank');
        } else {
            alert("Este pack no tiene un link configurado.");
        }
    } else {
        console.error("No se encontró el pack con ID:", id);
    }
}
